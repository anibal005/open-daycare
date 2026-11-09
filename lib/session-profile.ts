import { cache } from "react";
import { connection } from "next/server";
import { createClient } from "@/lib/supabase/server";

export type SessionRole = "staff" | "admin" | "parent";
export type SessionStatus = "active" | "inactive";

export interface SessionProfile {
  id: string;
  fullName: string;
  role: SessionRole;
  status: SessionStatus;
  daycareId: string;
  avatarUrl: string | null;
}

export interface FamilyChild {
  id: string;
  fullName: string;
  firstName: string;
  roomName: string;
  relationship: string;
}

export interface FamilyContext {
  profile: SessionProfile;
  children: FamilyChild[];
}

// Row shapes read from `public.users` / `parent_children`. The Supabase helpers
// are not instantiated with the generated `Database` type, so the columns used
// here are declared locally (same pattern as `lib/posts-data.ts`).
interface ProfileRow {
  id: string;
  full_name: string;
  role: SessionRole;
  status: SessionStatus;
  daycare_id: string;
  avatar_url: string | null;
}

interface FamilyChildRow {
  relationship: string;
  children: {
    id: string;
    full_name: string;
    status: "active" | "inactive";
    rooms: { name: string } | null;
  } | null;
}

const ACTIVE_STATUS: SessionStatus = "active";

export function isStaffProfile(
  profile: SessionProfile | null,
): profile is SessionProfile & { role: "staff" | "admin" } {
  return (
    profile !== null &&
    profile.status === ACTIVE_STATUS &&
    (profile.role === "staff" || profile.role === "admin")
  );
}

export function isParentProfile(
  profile: SessionProfile | null,
): profile is SessionProfile & { role: "parent" } {
  return (
    profile !== null &&
    profile.status === ACTIVE_STATUS &&
    profile.role === "parent"
  );
}

// One `auth.getUser()` + one `users` read per request, shared by the layouts,
// the pages and the sidebars through React's request memoization.
export const getSessionProfile = cache(
  async (): Promise<SessionProfile | null> => {
    // Supabase Auth reads the current time (`Date.now()`) while validating the
    // session. Prerendering stops here so the layouts and the root resolver are
    // always rendered per request.
    await connection();

    const supabase = await createClient();

    const {
      data: { user },
    } = await supabase.auth.getUser();

    if (!user) return null;

    const { data, error }: { data: ProfileRow | null; error: { code: string } | null } =
      await supabase
        .from("users")
        .select("id, full_name, role, status, daycare_id, avatar_url")
        .eq("id", user.id)
        .single();

    if (error || !data) {
      // `PGRST116` means the session has no row in `public.users`. That is an
      // expected state handled by `/access-denied`, not a query failure.
      if (error && error.code !== "PGRST116") {
        console.error("[session-profile] Failed to load profile", error.code);
      }
      return null;
    }

    return {
      id: data.id,
      fullName: data.full_name,
      role: data.role,
      status: data.status,
      daycareId: data.daycare_id,
      avatarUrl: data.avatar_url,
    };
  },
);

// Family shell + feed share the same linked children (name, room and
// relationship) without duplicating queries.
export const getFamilyContext = cache(
  async (): Promise<FamilyContext | null> => {
    const profile = await getSessionProfile();

    if (!isParentProfile(profile)) return null;

    const supabase = await createClient();
    const { data, error } = await supabase
      .from("parent_children")
      .select("relationship, children(id, full_name, status, rooms(name))")
      .eq("user_id", profile.id)
      .eq("status", "active")
      .overrideTypes<FamilyChildRow[], { merge: false }>();

    if (error) {
      console.error("[session-profile] Failed to load family links", error.code);
      return { profile, children: [] };
    }

    const children = (data ?? [])
      .flatMap((link) => {
        const child = link.children;
        if (!child || child.status !== "active") return [];
        return [
          {
            id: child.id,
            fullName: child.full_name,
            firstName: child.full_name.split(" ")[0] || child.full_name,
            roomName: child.rooms?.name ?? "",
            relationship: link.relationship,
          },
        ];
      })
      .sort((a, b) => a.fullName.localeCompare(b.fullName, "es"));

    return { profile, children };
  },
);
