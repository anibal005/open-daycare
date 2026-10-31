"use server";

import { revalidatePath } from "next/cache";
import type { PostgrestError } from "@supabase/supabase-js";
import { createClient } from "@/lib/supabase/server";
import { generateInviteCode } from "@/lib/invite-code";
import { resend } from "@/lib/email/resend";
import { buildInviteParentEmail } from "@/lib/email/templates/invite-parent";

type Relationship = "mother" | "father" | "tutor";

type InviteParentResult = { ok: true } | { ok: false; error: string };

const RELATIONSHIPS: readonly Relationship[] = ["mother", "father", "tutor"];
const EMAIL_PATTERN = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
const MAX_FULL_NAME_LENGTH = 120;
const MAX_EMAIL_LENGTH = 254;
const INVITE_TTL_MS = 7 * 24 * 60 * 60 * 1000;
const INVITE_CODE_ATTEMPTS = 5;

// Row shapes read by this action. The Supabase helpers in `lib/supabase/*` are
// not instantiated with the generated `Database` type, so the columns used here
// are declared locally (same pattern as `app/kid/[id]/page.tsx`).
interface InviterRow {
  id: string;
  daycare_id: string;
  role: string;
  status: string;
}

interface ChildRow {
  id: string;
  full_name: string;
  room_id: string;
  rooms: { daycare_id: string; daycares: { name: string } | null } | null;
}

type SupabaseServerClient = Awaited<ReturnType<typeof createClient>>;

function mapRelationshipLabel(relationship: Relationship) {
  if (relationship === "mother") return "Mamá";
  if (relationship === "father") return "Papá";
  return "Tutor/a";
}

function isRelationship(value: string): value is Relationship {
  return RELATIONSHIPS.includes(value as Relationship);
}

function normalizeEmail(email: string) {
  return email.trim().toLowerCase();
}

function isValidEmail(email: string) {
  return email.length <= MAX_EMAIL_LENGTH && EMAIL_PATTERN.test(email);
}

async function revokePendingInvitation(
  supabase: SupabaseServerClient,
  invitationId: string,
  revokedBy: string,
) {
  const { error } = await supabase
    .from("invitations")
    .update({
      status: "revoked",
      revoked_at: new Date().toISOString(),
      revoked_by: revokedBy,
    })
    .eq("id", invitationId)
    .eq("status", "pending");

  return error;
}

// `invitations.invite_code` is unique, so a collision is retried with a new
// code instead of failing the whole invitation.
async function insertPendingInvitation(
  supabase: SupabaseServerClient,
  values: {
    daycareId: string;
    childId: string;
    invitedBy: string;
    fullName: string;
    email: string;
    relationship: Relationship;
    expiresAt: string;
  },
): Promise<{ id: string; inviteCode: string } | null> {
  for (let attempt = 0; attempt < INVITE_CODE_ATTEMPTS; attempt += 1) {
    const inviteCode = generateInviteCode();

    const { data: inserted, error }: {
      data: { id: string } | null;
      error: PostgrestError | null;
    } = await supabase
      .from("invitations")
      .insert({
        daycare_id: values.daycareId,
        child_id: values.childId,
        invited_by: values.invitedBy,
        full_name: values.fullName,
        email: values.email,
        relationship: values.relationship,
        invite_code: inviteCode,
        status: "pending",
        expires_at: values.expiresAt,
      })
      .select("id")
      .single();

    if (!error) {
      return inserted ? { id: inserted.id, inviteCode } : null;
    }

    // 23505 is a unique violation. Only the invite code collision is
    // retryable; any other unique violation should surface as a failure.
    const isCodeCollision =
      error.code === "23505" && error.message.includes("invite_code");

    if (!isCodeCollision) {
      console.error("[invite-parent] Failed to create invitation", error.code);
      return null;
    }
  }

  console.error("[invite-parent] Could not generate a unique invite code");
  return null;
}

export async function inviteParentToChild(input: {
  childId: string;
  fullName: string;
  email: string;
  relationship: Relationship;
}): Promise<InviteParentResult> {
  const fullName = input.fullName.trim();
  const email = normalizeEmail(input.email);

  // Server-side validation: the client validates the same rules, but a Server
  // Action is a public endpoint and cannot trust its arguments.
  if (!fullName || fullName.length > MAX_FULL_NAME_LENGTH) {
    return { ok: false, error: "Ingresá el nombre del padre/madre" };
  }

  if (!isValidEmail(email)) {
    return { ok: false, error: "Ingresá un correo válido" };
  }

  if (!isRelationship(input.relationship)) {
    return { ok: false, error: "Seleccioná el parentesco" };
  }

  if (!input.childId) {
    return { ok: false, error: "Niño no encontrado" };
  }

  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    return { ok: false, error: "No autenticado" };
  }

  const { data: inviter }: { data: InviterRow | null } = await supabase
    .from("users")
    .select("id, daycare_id, role, status")
    .eq("id", user.id)
    .single();

  if (
    !inviter ||
    inviter.status !== "active" ||
    (inviter.role !== "admin" && inviter.role !== "staff")
  ) {
    return { ok: false, error: "No autorizado para enviar invitaciones" };
  }

  const { data: child }: { data: ChildRow | null } = await supabase
    .from("children")
    .select("id, full_name, room_id, rooms(daycare_id, daycares(name))")
    .eq("id", input.childId)
    .eq("status", "active")
    .single();

  if (!child) {
    return { ok: false, error: "Niño no encontrado" };
  }

  const daycareId = child.rooms?.daycare_id || inviter.daycare_id;
  const daycareName = child.rooms?.daycares?.name || "Guardería";

  if (daycareId !== inviter.daycare_id) {
    return { ok: false, error: "No autorizado para este niño" };
  }

  // Revoke existing pending invitations for the same child/email so only the
  // newest code stays valid.
  const { error: revokeError } = await supabase
    .from("invitations")
    .update({
      status: "revoked",
      revoked_at: new Date().toISOString(),
      revoked_by: inviter.id,
    })
    .eq("child_id", input.childId)
    .eq("email", email)
    .eq("status", "pending");

  if (revokeError) {
    console.error(
      "[invite-parent] Failed to revoke pending invitations",
      revokeError.code,
    );
    return { ok: false, error: "No se pudo crear la invitación" };
  }

  const invitation = await insertPendingInvitation(supabase, {
    daycareId,
    childId: input.childId,
    invitedBy: inviter.id,
    fullName,
    email,
    relationship: input.relationship,
    expiresAt: new Date(Date.now() + INVITE_TTL_MS).toISOString(),
  });

  if (!invitation) {
    return { ok: false, error: "No se pudo crear la invitación" };
  }

  const appUrl = (process.env.NEXT_PUBLIC_APP_URL || "http://localhost:3000").replace(
    /\/+$/,
    "",
  );
  const inviteUrl = `${appUrl}/activate-account?code=${encodeURIComponent(invitation.inviteCode)}&email=${encodeURIComponent(email)}`;
  const from =
    process.env.RESEND_FROM_EMAIL || "OpenDayCare <onboarding@resend.dev>";
  const template = buildInviteParentEmail({
    inviteeName: fullName,
    childName: child.full_name,
    daycareName,
    relationshipLabel: mapRelationshipLabel(input.relationship),
    inviteCode: invitation.inviteCode,
    inviteUrl,
  });

  // The SDK reports API failures through `error`; the try/catch only covers
  // network-level failures (per the Resend Node.js SDK docs).
  let emailFailureReason: string | null = null;

  try {
    const { error: emailError } = await resend.emails.send({
      from,
      to: email,
      subject: template.subject,
      html: template.html,
      text: template.text,
    });

    if (emailError) {
      emailFailureReason = emailError.name;
    }
  } catch (error) {
    emailFailureReason = error instanceof Error ? error.name : "unknown";
  }

  if (emailFailureReason) {
    const revokeError = await revokePendingInvitation(
      supabase,
      invitation.id,
      inviter.id,
    );

    if (revokeError) {
      console.error(
        "[invite-parent] Failed to revoke invitation after email failure",
        revokeError.code,
      );
    }

    console.error("[invite-parent] Failed to send invitation email", {
      invitationId: invitation.id,
      reason: emailFailureReason,
    });

    return { ok: false, error: "No se pudo enviar el correo. Intentá nuevamente." };
  }

  revalidatePath(`/kid/${input.childId}`);
  return { ok: true };
}
