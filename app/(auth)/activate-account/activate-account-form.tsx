"use client";

import { useActionState, useState } from "react";
import Link from "next/link";
import { activateAccountFromInvite } from "@/app/actions/activate-invite";

const SUN_PATH =
  "M12 2v2M12 20v2M4.9 4.9l1.4 1.4M17.7 17.7l1.4 1.4M2 12h2M20 12h2M4.9 19.1l1.4-1.4M17.7 6.3l1.4-1.4";

export default function ActivateAccountForm({
  code,
  email,
}: {
  code: string;
  email: string;
}) {
  const [password, setPassword] = useState("");
  const [error, submitAction, isPending] = useActionState<
    string | null,
    FormData
  >(async (_previousError, formData) => {
    const submittedPassword = String(formData.get("password") ?? "");
    if (!submittedPassword.trim()) {
      return "Ingresá una contraseña";
    }
    const result = await activateAccountFromInvite({
      code,
      email,
      password: submittedPassword,
    });
    if (result?.ok === false) {
      return result.error || "Error al activar la cuenta";
    }
    return null;
  }, null);

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

        <form action={submitAction}>
          <div className="mb-4">
            <label
              htmlFor="invite-code"
              className="mb-2 block text-[12px] font-extrabold tracking-[.7px] text-muted-dark"
            >
              CÓDIGO DE INVITACIÓN
            </label>
            <input
              id="invite-code"
              value={code}
              readOnly
              className="w-full rounded-[14px] border-[1.5px] border-input-line bg-[#f7f3ee] px-4 py-[13px] text-[18px] font-bold tracking-[3px] text-ink"
            />
          </div>

          <div className="mb-4">
            <label
              htmlFor="activate-email"
              className="mb-2 block text-[12px] font-extrabold tracking-[.7px] text-muted-dark"
            >
              EMAIL
            </label>
            <input
              id="activate-email"
              type="email"
              value={email}
              readOnly
              className="w-full rounded-[14px] border-[1.5px] border-input-line bg-[#f7f3ee] px-4 py-[13px] text-[15px] text-ink"
            />
          </div>

          <div className="mb-6">
            <label
              htmlFor="activate-password"
              className="mb-2 block text-[12px] font-extrabold tracking-[.7px] text-muted-dark"
            >
              CREAR CONTRASEÑA
            </label>
            <input
              id="activate-password"
              type="password"
              name="password"
              autoComplete="new-password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              className="w-full rounded-[14px] border-[1.5px] border-input-line bg-white px-4 py-[13px] text-[15px] text-ink"
            />
          </div>

          {error && (
            <p role="alert" className="mb-4 text-[13px] font-bold text-error">
              {error}
            </p>
          )}

          <button
            type="submit"
            disabled={isPending}
            className="block w-full rounded-[15px] bg-gradient-to-b from-[#F4977E] to-[#EE8164] p-[15px] text-center text-[16px] font-extrabold text-white shadow-[0_10px_22px_-8px_rgba(238,129,100,.7)] disabled:opacity-70"
          >
            {isPending ? "Activando..." : "Activar mi cuenta"}
          </button>
        </form>

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
