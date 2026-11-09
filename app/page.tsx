import { redirect } from "next/navigation";
import {
  getSessionProfile,
  isParentProfile,
  isStaffProfile,
} from "@/lib/session-profile";

// The resolver blocks on `cookies()` through `getSessionProfile()`.
export const instant = false;

export default async function RootPage() {
  const profile = await getSessionProfile();

  if (isStaffProfile(profile)) redirect("/staff");
  if (isParentProfile(profile)) redirect("/family");

  redirect("/access-denied");
}
