import CreatePostModal from "@/app/_components/create-post-modal";
import SidebarShell, {
  type SidebarNavItem,
} from "@/app/_components/sidebar-shell";
import type { SessionProfile } from "@/lib/session-profile";

const STAFF_NAV_ITEMS: SidebarNavItem[] = [
  { id: "feed", label: "Feed", icon: "home", href: "/staff" },
  { id: "children", label: "Niños", icon: "children", href: "/staff/children" },
  { id: "notices", label: "Avisos", icon: "bell" },
  { id: "account", label: "Mi cuenta", icon: "user" },
];

export default function StaffSidebar({ profile }: { profile: SessionProfile }) {
  return (
    <SidebarShell
      homeHref="/staff"
      brandSubtitle="Sala Soles"
      navItems={STAFF_NAV_ITEMS}
      profileName={profile.fullName}
      profileSubtitle={
        profile.role === "admin" ? "Administración" : "Personal de la guardería"
      }
      profileInitial={profile.fullName.trim().charAt(0).toUpperCase() || "U"}
      avatarClassName="bg-coral text-white"
      createPostSlot={<CreatePostModal variant="sidebar" />}
    />
  );
}
