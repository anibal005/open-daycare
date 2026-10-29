"use server";

import { revalidatePath } from "next/cache";
import { createClient } from "@/lib/supabase/server";
import { generateInviteCode } from "@/lib/invite-code";
import { resend } from "@/lib/email/resend";
import { buildInviteParentEmail } from "@/lib/email/templates/invite-parent";

type Relationship = "mother" | "father" | "tutor";

function mapRelationshipLabel(relationship: Relationship) {
  if (relationship === "mother") return "Mamá";
  if (relationship === "father") return "Papá";
  return "Tutor/a";
}

export async function inviteParentToChild(input: {
  childId: string;
  fullName: string;
  email: string;
  relationship: Relationship;
}) {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    return { ok: false, error: "No autenticado" };
  }

  const { data: inviter } = await supabase
    .from("users")
    .select("id, daycare_id, role")
    .eq("id", user.id)
    .single();

  if (!inviter || (inviter.role !== "admin" && inviter.role !== "staff")) {
    return { ok: false, error: "No autorizado para enviar invitaciones" };
  }

  const { data: child } = await supabase
    .from("children")
    .select("id, full_name, room_id, rooms(daycare_id, daycares(name))")
    .eq("id", input.childId)
    .single();

  if (!child) {
    return { ok: false, error: "Niño no encontrado" };
  }

  const daycareId = (child.rooms as any)?.daycare_id || inviter.daycare_id;
  const daycareName = (child.rooms as any)?.daycares?.name || "Guardería";

  if (daycareId !== inviter.daycare_id) {
    return { ok: false, error: "No autorizado para este niño" };
  }

  // Revoke existing pending invitations for same child/email
  await supabase
    .from("invitations")
    .update({
      status: "revoked",
      revoked_at: new Date().toISOString(),
      revoked_by: inviter.id,
    })
    .eq("child_id", input.childId)
    .eq("email", input.email.toLowerCase())
    .eq("status", "pending");

  const inviteCode = generateInviteCode();

  const { data: invitation, error: inviteError } = await supabase
    .from("invitations")
    .insert({
      daycare_id: daycareId,
      child_id: input.childId,
      invited_by: inviter.id,
      full_name: input.fullName.trim(),
      email: input.email.trim().toLowerCase(),
      relationship: input.relationship,
      invite_code: inviteCode,
      status: "pending",
      expires_at: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000).toISOString(),
    })
    .select("id")
    .single();

  if (inviteError || !invitation) {
    return { ok: false, error: "No se pudo crear la invitación" };
  }

  const appUrl = process.env.NEXT_PUBLIC_APP_URL || "http://localhost:3000";
  const inviteUrl = `${appUrl}/activate-account?code=${encodeURIComponent(inviteCode)}&email=${encodeURIComponent(input.email.trim())}`;

  try {
    const from = process.env.RESEND_FROM_EMAIL || "OpenDayCare <onboarding@resend.dev>";
    const template = buildInviteParentEmail({
      inviteeName: input.fullName.trim(),
      childName: child.full_name,
      daycareName,
      relationshipLabel: mapRelationshipLabel(input.relationship),
      inviteCode,
      inviteUrl,
    });
    const { data, error: emailError } = await resend.emails.send({
      from,
      to: input.email.trim(),
      subject: template.subject,
      html: template.html,
      text: template.text,
    });

    console.log("[invite-parent] resend", { data, emailError, from });

    if (emailError) {
      await supabase
        .from("invitations")
        .update({
          status: "revoked",
          revoked_at: new Date().toISOString(),
          revoked_by: inviter.id,
        })
        .eq("id", invitation.id);

      return { ok: false, error: emailError.message || "Error al enviar el correo" };
    }
  } catch (e: any) {
    console.error("[invite-parent] resend exception", e);
    await supabase
      .from("invitations")
      .update({
        status: "revoked",
        revoked_at: new Date().toISOString(),
        revoked_by: inviter.id,
      })
      .eq("id", invitation.id);

    return { ok: false, error: e?.message || "Error al enviar el correo" };
  }

  revalidatePath(`/kid/${input.childId}`);
  return { ok: true };
}
