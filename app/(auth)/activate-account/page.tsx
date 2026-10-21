import type { Metadata } from "next";
import Link from "next/link";
import AuthField from "@/app/_components/auth-field";

export const metadata: Metadata = {
  title: "Activar mi cuenta · OpenDayCare",
};

const SUN_PATH =
  "M12 2v2M12 20v2M4.9 4.9l1.4 1.4M17.7 17.7l1.4 1.4M2 12h2M20 12h2M4.9 19.1l1.4-1.4M17.7 6.3l1.4-1.4";

export default function ActivateAccountPage() {
  return (
    <div className="flex min-h-screen items-center justify-center bg-auth-bg p-10">
      <div className="w-full max-w-[440px]">
        <div className="mb-[22px] flex size-[58px] items-center justify-center rounded-[18px] bg-[linear-gradient(155deg,#F8C3A8,#F2937A)] shadow-[0_12px_26px_-10px_rgba(238,129,100,.65)]">
          <svg
            width="30"
            height="30"
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

        <h1 className="mb-2 font-fredoka text-[32px] leading-[1.15] font-semibold text-ink">
          Bienvenida a OpenDayCare
        </h1>
        <p className="mb-[26px] text-[15.5px] leading-[1.55] text-muted-dark">
          Te invitaron a seguir el día de tu hijo. Creá tu contraseña para
          activar la cuenta.
        </p>

        <div className="mb-[22px] flex items-center gap-[14px] rounded-[16px] border-[1.5px] border-input-line bg-white p-4">
          <div className="flex size-[44px] items-center justify-center rounded-full bg-[#A9D9E8] font-fredoka text-[19px] font-semibold text-[#1F7A93]">
            M
          </div>
          <div>
            <div className="text-[13px] text-muted-dark">
              Te invitaron a seguir a
            </div>
            <div className="font-fredoka text-[17px] font-semibold text-ink">
              Mateo · Sala Soles
            </div>
          </div>
        </div>

        <AuthField
          id="invitation-code"
          label="CÓDIGO DE INVITACIÓN"
          defaultValue="7K4P9"
          inputClassName="font-fredoka text-[18px] font-bold tracking-[3px]"
        />

        <AuthField
          id="email"
          label="EMAIL"
          type="email"
          defaultValue="lucia.fernandez@gmail.com"
        />

        <AuthField
          id="password"
          label="CREAR CONTRASEÑA"
          type="password"
          defaultValue="contraseña"
          inputClassName="border-kid-hover"
        />

        <label className="mb-6 flex cursor-pointer items-start gap-3 rounded-[14px] bg-[#FBF1D6] p-4">
          <input type="checkbox" defaultChecked className="hidden" />
          <span className="mt-px flex size-6 flex-none items-center justify-center rounded-[8px] bg-[#5FB97E]">
            <svg
              width="15"
              height="15"
              viewBox="0 0 24 24"
              fill="none"
              stroke="#fff"
              strokeWidth="3"
              strokeLinecap="round"
              strokeLinejoin="round"
            >
              <polyline points="20 6 9 17 4 12" />
            </svg>
          </span>
          <span className="text-[14px] leading-[1.45] text-[#8A7234]">
            Autorizo a la guardería a tomar y compartir fotos de mi hijo dentro
            de la app.
          </span>
        </label>

        <Link
          href="/"
          className="block w-full rounded-[15px] bg-gradient-to-b from-[#F4977E] to-[#EE8164] p-[15px] text-center text-[16px] font-extrabold text-white shadow-[0_10px_22px_-8px_rgba(238,129,100,.7)]"
        >
          Activar mi cuenta
        </Link>

        <p className="mt-[22px] text-center text-[14.5px] text-muted-dark">
          ¿Ya tenés cuenta?{" "}
          <Link href="/login" className="font-extrabold text-auth-link">
            Iniciar sesión
          </Link>
        </p>
      </div>
    </div>
  );
}
