import { redirect } from "next/navigation";
import FamilySidebar from "@/app/_components/family-sidebar";
import {
  getFamilyContext,
  getSessionProfile,
  isParentProfile,
  isStaffProfile,
} from "@/lib/session-profile";

// The family shell needs the session profile and linked children.
export const instant = false;

export default async function FamilyLayout({
  children,
}: LayoutProps<"/family">) {
  const profile = await getSessionProfile();

  if (!profile) redirect("/access-denied");
  if (isStaffProfile(profile)) redirect("/staff");
  if (!isParentProfile(profile)) redirect("/access-denied");

  const context = await getFamilyContext();
  if (!context) redirect("/access-denied");

  return (
    <div className="flex min-h-screen bg-cream">
      <FamilySidebar
        profile={context.profile}
        linkedChildren={context.children}
      />

      <main className="h-screen flex-1 min-w-0 overflow-y-auto">{children}</main>
    </div>
  );
}
