import SidebarShell, {
  type SidebarNavItem,
} from "@/app/_components/sidebar-shell";
import type { FamilyChild, SessionProfile } from "@/lib/session-profile";

const FAMILY_NAV_ITEMS: SidebarNavItem[] = [
  { id: "feed", label: "Feed", icon: "home", href: "/family" },
  { id: "summary", label: "Resumen del día", icon: "summary" },
  { id: "account", label: "Mi cuenta", icon: "user" },
];

function buildProfileSubtitle(children: FamilyChild[]) {
  if (children.length === 0) return "Familia";

  const [first] = children;
  const relationship = first.relationship;

  if (children.length === 1) {
    if (relationship === "mother") return `Mamá de ${first.firstName}`;
    if (relationship === "father") return `Papá de ${first.firstName}`;
    return `Familia de ${first.firstName}`;
  }

  const names =
    children.length === 2
      ? `${children[0].firstName} y ${children[1].firstName}`
      : `${first.firstName} y ${children.length - 1} más`;

  return `Familia de ${names}`;
}

export default function FamilySidebar({
  profile,
  linkedChildren,
}: {
  profile: SessionProfile;
  linkedChildren: FamilyChild[];
}) {
  return (
    <SidebarShell
      homeHref="/family"
      brandSubtitle="Familia"
      navItems={FAMILY_NAV_ITEMS}
      profileName={profile.fullName}
      profileSubtitle={buildProfileSubtitle(linkedChildren)}
      profileInitial={profile.fullName.trim().charAt(0).toUpperCase() || "U"}
      avatarClassName="bg-[#C9B6E8] text-white"
    />
  );
}
