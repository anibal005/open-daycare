"use server";

import { createClient } from "@/lib/supabase/server";

export interface PostRecipient {
  id: string;
  fullName: string;
  photoConsent: boolean;
}

export type GetPostRecipientsResult =
  | { ok: true; daycareId: string; recipients: PostRecipient[] }
  | { ok: false; error: string };

// Row shapes read by this action. The Supabase helpers in `lib/supabase/*` are
// not instantiated with the generated `Database` type, so the columns used here
// are declared locally (same pattern as `app/kid/[id]/page.tsx`).
interface ProfileRow {
  id: string;
  daycare_id: string;
  role: string;
  status: string;
}

interface ChildRow {
  id: string;
  full_name: string;
  photo_consent: boolean;
  // Embedded only to filter by daycare; this action never reads it.
  rooms: unknown;
}

export async function getPostRecipients(): Promise<GetPostRecipientsResult> {
  const supabase = await createClient();

  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    return { ok: false, error: "Tu sesión expiró. Volvé a iniciar sesión." };
  }

  const { data: profile, error: profileError }: {
    data: ProfileRow | null;
    error: { code: string } | null;
  } = await supabase
    .from("users")
    .select("id, daycare_id, role, status")
    .eq("id", user.id)
    .single();

  if (
    profileError ||
    !profile ||
    profile.status !== "active" ||
    (profile.role !== "staff" && profile.role !== "admin")
  ) {
    if (profileError) {
      console.error(
        "[post-recipients] Failed to load profile",
        profileError.code,
      );
    }
    return { ok: false, error: "No tenés permiso para publicar" };
  }

  const { data: children, error: childrenError }: {
    data: ChildRow[] | null;
    error: { code: string } | null;
  } = await supabase
    .from("children")
    .select("id, full_name, photo_consent, rooms!inner(daycare_id)")
    .eq("status", "active")
    .eq("rooms.daycare_id", profile.daycare_id)
    .order("full_name");

  if (childrenError) {
    console.error(
      "[post-recipients] Failed to load children",
      childrenError.code,
    );
    return { ok: false, error: "No se pudieron cargar los niños" };
  }

  return {
    ok: true,
    daycareId: profile.daycare_id,
    recipients: (children ?? []).map((child) => ({
      id: child.id,
      fullName: child.full_name,
      photoConsent: child.photo_consent,
    })),
  };
}
