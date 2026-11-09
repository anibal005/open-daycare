import { redirect } from "next/navigation";
import StaffSidebar from "@/app/_components/staff-sidebar";
import {
  getSessionProfile,
  isParentProfile,
  isStaffProfile,
} from "@/lib/session-profile";

// The staff shell needs the session profile, so this segment renders on request.
export const instant = false;

export default async function StaffLayout({ children }: LayoutProps<"/staff">) {
  const profile = await getSessionProfile();

  if (!profile) redirect("/access-denied");
  if (isParentProfile(profile)) redirect("/family");
  if (!isStaffProfile(profile)) redirect("/access-denied");

  return (
    <div className="flex min-h-screen bg-cream">
      <StaffSidebar profile={profile} />

      <main className="h-screen flex-1 min-w-0 overflow-y-auto">{children}</main>
    </div>
  );
}
