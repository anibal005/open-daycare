"use server";

import { redirect } from "next/navigation";
import type { PostgrestError } from "@supabase/supabase-js";
import { getAdminClient } from "@/lib/supabase/admin";

type ActivateInviteResult = { ok: false; error: string };

const MIN_PASSWORD_LENGTH = 6;
const EMAIL_PATTERN = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

// Row shape read by this action. The Supabase helpers are not instantiated with
// the generated `Database` type, so the columns used here are declared locally
// (same pattern as `app/kid/[id]/page.tsx`).
interface InvitationRow {
  id: string;
  daycare_id: string;
  child_id: string;
  full_name: string;
  email: string;
  relationship: string;
  expires_at: string;
}

// Compensates a partially created account: without this, a failure after
// `auth.admin.createUser` would leave an Auth user with no profile, and the
// retry would fail with "email already registered".
async function rollbackCreatedUser(userId: string, reason: string) {
  const { error } = await getAdminClient().auth.admin.deleteUser(userId);

  if (error) {
    console.error(
      "[activate-invite] Failed to roll back the created auth user",
      { reason, code: error.code },
    );
  }
}

export async function activateAccountFromInvite(input: {
  code: string;
  email: string;
  password: string;
}): Promise<ActivateInviteResult> {
  const code = input.code.trim().toUpperCase();
  const email = input.email.trim().toLowerCase();

  // Server-side validation: the form validates the same rules, but a Server
  // Action is a public endpoint and cannot trust its arguments.
  if (!code) {
    return { ok: false, error: "Código de invitación inválido o ya utilizado" };
  }

  if (!EMAIL_PATTERN.test(email)) {
    return { ok: false, error: "Ingresá un correo válido" };
  }

  if (input.password.length < MIN_PASSWORD_LENGTH) {
    return {
      ok: false,
      error: `La contraseña debe tener al menos ${MIN_PASSWORD_LENGTH} caracteres`,
    };
  }

  const admin = getAdminClient();

  // The activation page is public, so the invitation is read with the service
  // role (RLS only lets staff/admin read `invitations`). The code is matched
  // exactly after normalizing to uppercase: `ilike` would treat `%` and `_`
  // typed by the visitor as wildcards.
  const { data: invitation }: { data: InvitationRow | null } = await admin
    .from("invitations")
    .select(
      "id, daycare_id, child_id, full_name, email, relationship, expires_at",
    )
    .eq("invite_code", code)
    .eq("status", "pending")
    .maybeSingle();

  if (!invitation) {
    return { ok: false, error: "Código de invitación inválido o ya utilizado" };
  }

  if (new Date(invitation.expires_at).getTime() <= Date.now()) {
    const { error: expireError } = await admin
      .from("invitations")
      .update({ status: "expired" })
      .eq("id", invitation.id)
      .eq("status", "pending");

    if (expireError) {
      console.error(
        "[activate-invite] Failed to mark the invitation as expired",
        expireError.code,
      );
    }

    return { ok: false, error: "La invitación ha expirado" };
  }

  if (invitation.email.trim().toLowerCase() !== email) {
    return { ok: false, error: "El correo no coincide con la invitación" };
  }

  // Direct account: the email is confirmed by the invitation itself, so the
  // parent can sign in right away (spec-10, reglas de negocio).
  const { data: authData, error: authError } = await admin.auth.admin.createUser(
    {
      email: invitation.email,
      password: input.password,
      email_confirm: true,
    },
  );

  if (authError || !authData.user) {
    if (
      authError?.code === "email_exists" ||
      authError?.code === "user_already_exists"
    ) {
      return {
        ok: false,
        error: "Ya existe una cuenta con este correo. Iniciá sesión.",
      };
    }

    console.error(
      "[activate-invite] Failed to create the auth user",
      authError?.code,
    );
    return { ok: false, error: "No se pudo crear la cuenta" };
  }

  const userId = authData.user.id;

  const { error: profileError } = await admin.from("users").upsert({
    id: userId,
    daycare_id: invitation.daycare_id,
    role: "parent",
    status: "active",
    full_name: invitation.full_name.trim(),
  });

  if (profileError) {
    console.error(
      "[activate-invite] Failed to create the user profile",
      profileError.code,
    );
    await rollbackCreatedUser(userId, "user_profile");
    return {
      ok: false,
      error: "No se pudo activar la cuenta. Intentá nuevamente.",
    };
  }

  const { error: linkError } = await admin.from("parent_children").upsert(
    {
      child_id: invitation.child_id,
      user_id: userId,
      relationship: invitation.relationship,
      status: "active",
    },
    { onConflict: "child_id,user_id" },
  );

  if (linkError) {
    console.error(
      "[activate-invite] Failed to link the parent to the child",
      linkError.code,
    );
    await rollbackCreatedUser(userId, "parent_children");
    return {
      ok: false,
      error: "No se pudo activar la cuenta. Intentá nuevamente.",
    };
  }

  // Conditional update: if a concurrent request consumed the invitation in the
  // meantime, no row is returned. The account created here is then rolled back
  // so a single code cannot produce two accounts.
  const { data: claimed, error: claimError }: {
    data: { id: string }[] | null;
    error: PostgrestError | null;
  } = await admin
    .from("invitations")
    .update({
      status: "accepted",
      accepted_at: new Date().toISOString(),
      accepted_by_user_id: userId,
    })
    .eq("id", invitation.id)
    .eq("status", "pending")
    .select("id");

  if (claimError || !claimed || claimed.length === 0) {
    console.error("[activate-invite] Could not consume the invitation", {
      invitationId: invitation.id,
      code: claimError?.code,
    });
    await rollbackCreatedUser(userId, "invitation_not_pending");
    return { ok: false, error: "La invitación ya fue utilizada" };
  }

  redirect("/login?activated=1");
}
