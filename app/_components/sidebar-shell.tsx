"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import type { ReactNode } from "react";
import SignOutButton from "@/app/_components/sign-out-button";

const SUN_PATH =
  "M12 2v2M12 20v2M4.9 4.9l1.4 1.4M17.7 17.7l1.4 1.4M2 12h2M20 12h2M4.9 19.1l1.4-1.4M17.7 6.3l1.4-1.4";

const HOME_PATH =
  "M3 9.5 12 3l9 6.5V20a1 1 0 0 1-1 1h-5v-6H9v6H4a1 1 0 0 1-1-1z";

const CHILDREN_PATH =
  "M2.5 20a6.5 6.5 0 0 1 13 0M16 20a5 5 0 0 1 5.5-4.9";

const BELL_PATH =
  "M18 8a6 6 0 0 0-12 0c0 7-3 9-3 9h18s-3-2-3-9M13.7 21a2 2 0 0 1-3.4 0";

const USER_PATH = "M20 21v-2a4 4 0 0 0-4-4H8a4 4 0 0 0-4 4v2";

const SUMMARY_PATH = SUN_PATH;

export type SidebarNavIcon =
  | "home"
  | "children"
  | "bell"
  | "user"
  | "summary";

export interface SidebarNavItem {
  id: string;
  label: string;
  icon: SidebarNavIcon;
  href?: string;
}

interface SidebarShellProps {
  homeHref: string;
  brandSubtitle: string;
  navItems: SidebarNavItem[];
  profileName: string;
  profileSubtitle: string;
  profileInitial: string;
  avatarClassName: string;
  createPostSlot?: ReactNode;
}

const ICON_PATHS: Record<SidebarNavIcon, string> = {
  home: HOME_PATH,
  children: CHILDREN_PATH,
  bell: BELL_PATH,
  user: USER_PATH,
  summary: SUMMARY_PATH,
};

function isActivePath(pathname: string, href: string) {
  if (href === "/staff" || href === "/family") return pathname === href;
  return pathname === href || pathname.startsWith(`${href}/`);
}

function NavIcon({ icon }: { icon: SidebarNavIcon }) {
  return (
    <svg
      width="19"
      height="19"
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="2"
      strokeLinecap="round"
      strokeLinejoin="round"
      aria-hidden="true"
      focusable="false"
    >
      {icon === "children" ? (
        <>
          <circle cx="9" cy="7" r="3" />
          <circle cx="17" cy="9" r="2.4" />
        </>
      ) : null}
      {icon === "user" ? <circle cx="12" cy="7" r="4" /> : null}
      <path d={ICON_PATHS[icon]} />
    </svg>
  );
}

export default function SidebarShell({
  homeHref,
  brandSubtitle,
  navItems,
  profileName,
  profileSubtitle,
  profileInitial,
  avatarClassName,
  createPostSlot,
}: SidebarShellProps) {
  const pathname = usePathname();

  return (
    <aside className="sticky top-0 flex h-screen w-[248px] flex-none flex-col border-r border-line bg-card px-4 py-6">
      <Link
        href={homeHref}
        className="flex items-center gap-[11px] px-2 pb-[22px] pt-1"
      >
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
            aria-hidden="true"
            focusable="false"
          >
            <circle cx="12" cy="12" r="4" />
            <path d={SUN_PATH} />
          </svg>
        </div>
        <div>
          <div className="font-fredoka text-[17px] leading-none font-semibold text-ink">
            OpenDayCare
          </div>
          <div className="mt-0.5 text-[11.5px] text-muted">{brandSubtitle}</div>
        </div>
      </Link>

      {createPostSlot}

      <nav className="flex flex-1 flex-col gap-1">
        {navItems.map((item) => {
          if (!item.href) {
            return (
              <span
                key={item.id}
                aria-disabled="true"
                title="Sección no disponible todavía"
                className="flex cursor-not-allowed items-center gap-3 rounded-[12px] px-3 py-[11px] text-[14.5px] font-semibold text-[#B6A99B] opacity-60"
              >
                <NavIcon icon={item.icon} />
                {item.label}
                <span className="sr-only"> (no disponible todavía)</span>
              </span>
            );
          }

          const active = isActivePath(pathname, item.href);

          return (
            <Link
              key={item.id}
              href={item.href}
              aria-current={active ? "page" : undefined}
              className={
                active
                  ? "flex items-center gap-3 rounded-[12px] bg-coral-soft px-3 py-[11px] text-[14.5px] font-extrabold text-coral-dark"
                  : "flex items-center gap-3 rounded-[12px] px-3 py-[11px] text-[14.5px] font-semibold text-[#6E6359]"
              }
            >
              <NavIcon icon={item.icon} />
              {item.label}
            </Link>
          );
        })}
      </nav>

      <div className="mt-[10px] border-t border-line pt-[14px]">
        <div className="flex items-center gap-[11px] px-2 py-1.5">
          <div
            aria-hidden="true"
            className={`font-fredoka flex size-[38px] flex-none items-center justify-center rounded-full text-[16px] font-semibold ${avatarClassName}`}
          >
            {profileInitial}
          </div>
          <div className="min-w-0 flex-1">
            <div className="truncate text-[14px] font-extrabold text-ink">
              {profileName}
            </div>
            <div className="truncate text-[12px] text-muted">
              {profileSubtitle}
            </div>
          </div>
          <SignOutButton />
        </div>
      </div>
    </aside>
  );
}
