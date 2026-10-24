"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useEffect, useState } from "react";
import CreatePostModal from "@/app/_components/create-post-modal";
import { createClient } from "@/lib/supabase/client";

const SUN_PATH =
  "M12 2v2M12 20v2M4.9 4.9l1.4 1.4M17.7 17.7l1.4 1.4M2 12h2M20 12h2M4.9 19.1l1.4-1.4M17.7 6.3l1.4-1.4";

const HOME_PATH = "M3 9.5 12 3l9 6.5V20a1 1 0 0 1-1 1h-5v-6H9v6H4a1 1 0 0 1-1-1z";

const CHILDREN_PATH =
  "M2.5 20a6.5 6.5 0 0 1 13 0M16 20a5 5 0 0 1 5.5-4.9";

const BELL_PATH =
  "M18 8a6 6 0 0 0-12 0c0 7-3 9-3 9h18s-3-2-3-9M13.7 21a2 2 0 0 1-3.4 0";

const USER_PATH = "M20 21v-2a4 4 0 0 0-4-4H8a4 4 0 0 0-4 4v2";

const LOGOUT_PATH = "M9 21H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h4M16 17l5-5-5-5M21 12H9";

type NavItemId = "feed" | "kids" | "avisos" | "cuenta";

const NAV_ITEMS: {
  id: NavItemId;
  label: string;
  iconPath: string;
  href: string;
}[] = [
  { id: "feed", label: "Feed", iconPath: HOME_PATH, href: "/" },
  { id: "kids", label: "Niños", iconPath: CHILDREN_PATH, href: "/kid" },
  { id: "avisos", label: "Avisos", iconPath: BELL_PATH, href: "#" },
  { id: "cuenta", label: "Mi cuenta", iconPath: USER_PATH, href: "#" },
];

export default function Sidebar({
  activeItem = "feed",
}: {
  activeItem?: "feed" | "kids";
}) {
  const router = useRouter();
  const supabase = createClient();
  const [userName, setUserName] = useState("Caro Giménez");
  const [userRole, setUserRole] = useState("Maestra · Soles");
  const [initial, setInitial] = useState("C");

  useEffect(() => {
    const loadUser = async () => {
      const {
        data: { user },
      } = await supabase.auth.getUser();
      if (!user) return;

      const fullName =
        (user.user_metadata?.full_name as string) ||
        (user.user_metadata?.name as string) ||
        (user.email?.split("@")[0] as string) ||
        "Usuario";
      const role =
        (user.user_metadata?.role as string) ||
        (user.user_metadata?.cargo as string) ||
        "Usuario";

      setUserName(fullName);
      setUserRole(role);
      setInitial(fullName.trim().charAt(0).toUpperCase() || "U");
    };
    loadUser();
  }, [supabase]);
  return (
    <aside className="sticky top-0 flex h-screen w-[248px] flex-none flex-col border-r border-line bg-card px-4 py-6">
      <Link href="/" className="flex items-center gap-[11px] px-2 pb-[22px] pt-1">
        <div className="flex size-[38px] flex-none items-center justify-center rounded-[12px] bg-gradient-to-br from-[#F8C3A8] to-[#F2937A]">
          <svg
            width="21"
            height="21"
            viewBox="0 0 24 24"
            fill="none"
            stroke="#fff"
            strokeWidth="2.2"
            strokeLinecap="round"
            strokeLinejoin="round"
          >
            <circle cx="12" cy="12" r="4" />
            <path d={SUN_PATH} />
          </svg>
        </div>
        <div>
          <div className="font-fredoka text-[17px] leading-none font-semibold text-ink">
            OpenDayCare
          </div>
          <div className="mt-0.5 text-[11.5px] text-muted">Sala Soles</div>
        </div>
      </Link>

      <CreatePostModal variant="sidebar" />

      <nav className="flex flex-1 flex-col gap-1">
        {NAV_ITEMS.map((item) => (
          <Link
            key={item.id}
            href={item.href}
            className={
              item.id === activeItem
                ? "flex items-center gap-3 rounded-[12px] bg-coral-soft px-3 py-[11px] text-[14.5px] font-extrabold text-coral-dark"
                : "flex items-center gap-3 rounded-[12px] px-3 py-[11px] text-[14.5px] font-semibold text-[#6E6359]"
            }
          >
            <svg
              width="19"
              height="19"
              viewBox="0 0 24 24"
              fill="none"
              stroke="currentColor"
              strokeWidth="2"
              strokeLinecap="round"
              strokeLinejoin="round"
            >
              {item.id === "kids" ? (
                <>
                  <circle cx="9" cy="7" r="3" />
                  <circle cx="17" cy="9" r="2.4" />
                </>
              ) : null}
              {item.id === "cuenta" ? (
                <circle cx="12" cy="7" r="4" />
              ) : null}
              <path d={item.iconPath} />
            </svg>
            {item.label}
          </Link>
        ))}
      </nav>

      <div className="mt-[10px] border-t border-line pt-[14px]">
        <div className="flex items-center gap-[11px] px-2 py-1.5">
          <div className="font-fredoka flex size-[38px] flex-none items-center justify-center rounded-full bg-coral text-[16px] font-semibold text-white">
            {initial}
          </div>
          <div className="min-w-0 flex-1">
            <div className="truncate text-[14px] font-extrabold text-ink">
              {userName}
            </div>
            <div className="truncate text-[12px] text-muted">{userRole}</div>
          </div>
          <button
            onClick={async () => {
              await supabase.auth.signOut();
              router.push("/login");
              router.refresh();
            }}
            title="Cerrar sesión"
            className="flex size-8 flex-none items-center justify-center rounded-[10px] bg-cream text-[#94887B]"
          >
            <svg
              width="16"
              height="16"
              viewBox="0 0 24 24"
              fill="none"
              stroke="currentColor"
              strokeWidth="2"
              strokeLinecap="round"
              strokeLinejoin="round"
            >
              <path d={LOGOUT_PATH} />
            </svg>
          </button>
        </div>
      </div>
    </aside>
  );
}
