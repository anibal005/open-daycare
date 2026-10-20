import type { Metadata } from "next";
import Link from "next/link";
import AuthField from "@/app/_components/auth-field";

export const metadata: Metadata = {
  title: "Iniciar sesión · OpenDayCare",
};

const SUN_PATH =
  "M12 2v2M12 20v2M4.9 4.9l1.4 1.4M17.7 17.7l1.4 1.4M2 12h2M20 12h2M4.9 19.1l1.4-1.4M17.7 6.3l1.4-1.4";

export default function LoginPage() {
  return (
    <div className="grid min-h-screen grid-cols-[1.05fr_1fr] bg-auth-bg">
      <div className="relative flex flex-col justify-between overflow-hidden bg-[linear-gradient(155deg,#F6A98E_0%,#F2937A_45%,#EC7E62_100%)] p-[56px_60px] text-white">
        <div className="absolute -top-[140px] -right-[120px] size-[420px] rounded-full bg-[rgba(255,255,255,.12)]" />
        <div className="absolute -bottom-[110px] -left-[80px] size-[300px] rounded-full bg-[rgba(255,255,255,.10)]" />

        <div className="relative flex items-center gap-[13px]">
          <div className="flex size-[46px] items-center justify-center rounded-[14px] bg-[rgba(255,255,255,.22)]">
            <svg
              width="26"
              height="26"
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
          <span className="font-fredoka text-[21px] font-semibold tracking-[.5px]">
            OpenDayCare
          </span>
        </div>

        <div className="relative">
          <h1 className="mb-[18px] font-fredoka text-[42px] leading-[1.12] font-semibold">
            El día de cada niño,
            <br />
            compartido con su familia.
          </h1>
          <p className="max-w-[430px] text-[17px] leading-[1.6] text-[rgba(255,255,255,.92)]">
            Publicá momentos, gestioná las salas y mantené a las familias cerca,
            desde un solo lugar.
          </p>
        </div>

        <div className="relative text-[14px] text-[rgba(255,255,255,.9)]">
          🌿 Guardería Sala Soles
        </div>
      </div>

      <div className="flex items-center justify-center p-10">
        <div className="w-full max-w-[392px]">
          <h2 className="mb-[6px] font-fredoka text-[30px] font-semibold text-ink">
            Iniciar sesión
          </h2>
          <p className="mb-7 text-[15px] text-muted-dark">
            Ingresá para ver el día de hoy.
          </p>

          <AuthField
            id="email"
            label="EMAIL"
            type="email"
            defaultValue="caro@opendaycare.com"
          />

          <AuthField
            id="password"
            label="CONTRASEÑA"
            type="password"
            placeholder="••••••••"
          />

          <div className="mb-5 text-right">
            <a
              href="#"
              className="text-[13.5px] font-bold text-auth-link"
            >
              ¿Olvidaste tu contraseña?
            </a>
          </div>

          <Link
            href="/"
            className="block w-full rounded-[15px] bg-gradient-to-b from-[#F4977E] to-[#EE8164] p-[15px] text-center text-[16px] font-extrabold text-white shadow-[0_10px_22px_-8px_rgba(238,129,100,.7)]"
          >
            Iniciar sesión
          </Link>

          <p className="mt-6 text-center text-[14.5px] text-muted-dark">
            ¿Te invitó la guardería?{" "}
            <Link
              href="/activate-account"
              className="font-extrabold text-auth-link"
            >
              Activá tu cuenta
            </Link>
          </p>
        </div>
      </div>
    </div>
  );
}
