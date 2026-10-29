"use server";

import { createClient } from "@supabase/supabase-js";
import { createClient as createServerClient } from "@/lib/supabase/server";
import { redirect } from "next/navigation";

function getServiceRoleClient() {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL!;
  const key = process.env.SUPABASE_SERVICE_ROLE_KEY!;
  return createClient(url, key, {
    auth: { autoRefreshToken: false, persistSession: false },
  });
}

export async function activateAccountFromInvite(input: {
  code: string;
  email: string;
  password: string;
}) {
  const supabase = await createServerClient();
  const service = getServiceRoleClient();

  // Validate invitation with service role (public activation flow)
  const codeInput = input.code.trim();
  const { data: invitation, error: invError } = await service
    .from("invitations")
    .select("*")
    .ilike("invite_code", codeInput)
    .eq("status", "pending")
    .maybeSingle();

  const { data: anyInv } = await service
    .from("invitations")
    .select("invite_code, status, email, expires_at, created_at")
    .ilike("invite_code", codeInput)
    .order("created_at", { ascending: false })
    .limit(5);

  console.log("[activate] debug", {
    codeInput,
    emailInput: input.email,
    foundPending: !!invitation,
    invError,
    anyInv,
  });

  if (!invitation) {
    return { ok: false, error: "Código de invitación inválido o ya utilizado" };
  }

  if (new Date(invitation.expires_at) < new Date()) {
    await service
      .from("invitations")
      .update({ status: "expired" })
      .eq("id", invitation.id);
    return { ok: false, error: "La invitación ha expirado" };
  }

  if (invitation.email.toLowerCase() !== input.email.trim().toLowerCase()) {
    return { ok: false, error: "El correo no coincide con la invitación" };
  }

  // Create user directly with service role
  const { data: authData, error: authError } = await service.auth.admin.createUser({
    email: invitation.email,
    password: input.password,
    email_confirm: true,
  });

  if (authError || !authData.user) {
    return { ok: false, error: "No se pudo crear la cuenta" };
  }

  // Create/update user profile
  await service.from("users").upsert({
    id: authData.user.id,
    daycare_id: invitation.daycare_id,
    role: "parent",
    status: "active",
    full_name: invitation.full_name,
  });

  // Create/update parent_children link
  await service.from("parent_children").upsert(
    {
      child_id: invitation.child_id,
      user_id: authData.user.id,
      relationship: invitation.relationship,
      status: "active",
    },
    { onConflict: "child_id,user_id" }
  );

  // Mark invitation as accepted
  await service
    .from("invitations")
    .update({
      status: "accepted",
      accepted_at: new Date().toISOString(),
      accepted_by_user_id: authData.user.id,
    })
    .eq("id", invitation.id);

  redirect("/login?activated=1");
}
