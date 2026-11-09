import { redirect } from "next/navigation";
import SignOutButton from "@/app/_components/sign-out-button";
import {
  getSessionProfile,
  isParentProfile,
  isStaffProfile,
} from "@/lib/session-profile";

export const instant = false;

export default async function AccessDeniedPage() {
  const profile = await getSessionProfile();

  // An active profile never needs this screen: send it to its own area. The
  // page exists for sessions without an active `public.users` row.
  if (isStaffProfile(profile)) redirect("/staff");
  if (isParentProfile(profile)) redirect("/family");

  return (
    <main className="flex min-h-screen items-center justify-center bg-cream px-6 py-12">
      <div className="w-full max-w-[460px] rounded-[24px] border border-line bg-card px-8 py-10 text-center shadow-[0_10px_30px_-18px_rgba(120,90,60,.6)]">
        <div className="mx-auto flex size-[56px] flex-none items-center justify-center rounded-full bg-[#F9D2DE] text-[#C56486]">
          <svg
            width="26"
            height="26"
            viewBox="0 0 24 24"
            fill="none"
            stroke="currentColor"
            strokeWidth="2"
            strokeLinecap="round"
            strokeLinejoin="round"
            aria-hidden="true"
            focusable="false"
          >
            <circle cx="12" cy="12" r="9" />
            <path d="M12 8v4M12 16h.01" />
          </svg>
        </div>

        <h1 className="font-fredoka mt-5 mb-2 text-[26px] font-semibold text-ink">
          No pudimos abrir tu panel
        </h1>
        <p className="m-0 text-[15px] leading-[1.6] text-muted-dark">
          Tu cuenta no tiene un perfil activo en esta guardería. Cerrá sesión y
          volvé a ingresar, o pedile a la guardería que revise tu acceso.
        </p>

        <div className="mt-7">
          <SignOutButton label="Cerrar sesión" variant="full" />
        </div>
      </div>
    </main>
  );
}
