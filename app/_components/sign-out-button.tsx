"use client";

import { useState } from "react";
import { createClient } from "@/lib/supabase/client";

const LOGOUT_PATH =
  "M9 21H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h4M16 17l5-5-5-5M21 12H9";

interface SignOutButtonProps {
  label?: string;
  variant?: "icon" | "full";
}

export default function SignOutButton({
  label,
  variant = "icon",
}: SignOutButtonProps) {
  const supabase = createClient();
  const [loading, setLoading] = useState(false);
  const text = label ?? "Cerrar sesión";

  async function handleSignOut() {
    if (loading) return;
    setLoading(true);

    try {
      const { error } = await supabase.auth.signOut();

      if (error) {
        // Keep the session visible instead of navigating to a state the user
        // cannot recover from; the button becomes usable again.
        console.error("[sign-out] Failed to sign out", error.code);
        setLoading(false);
        return;
      }

      // Full navigation discards the client router cache of the previous role.
      window.location.assign("/login");
    } catch (error) {
      // A network failure must not leave the button stuck in its loading state.
      console.error("[sign-out] Unexpected sign-out failure", error);
      setLoading(false);
    }
  }

  const icon = (
    <svg
      width={variant === "full" ? 18 : 16}
      height={variant === "full" ? 18 : 16}
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="2"
      strokeLinecap="round"
      strokeLinejoin="round"
      aria-hidden="true"
      focusable="false"
    >
      <path d={LOGOUT_PATH} />
    </svg>
  );

  if (variant === "full") {
    return (
      <button
        type="button"
        onClick={handleSignOut}
        disabled={loading}
        aria-busy={loading || undefined}
        className="inline-flex items-center justify-center gap-[9px] rounded-[12px] border-[1.5px] border-line bg-cream px-5 py-[10px] text-[14.5px] font-extrabold text-[#6E6359] disabled:opacity-60"
      >
        {icon}
        {loading ? "Cerrando sesión…" : text}
      </button>
    );
  }

  return (
    <button
      type="button"
      onClick={handleSignOut}
      disabled={loading}
      aria-busy={loading || undefined}
      aria-label={text}
      title={text}
      className="flex size-8 flex-none items-center justify-center rounded-[10px] bg-cream text-[#94887B] disabled:opacity-60"
    >
      {icon}
    </button>
  );
}
