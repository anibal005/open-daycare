import type { Metadata } from "next";
import { Suspense } from "react";
import ActivateAccountForm from "./activate-account-form";

export const metadata: Metadata = {
  title: "Activar mi cuenta · OpenDayCare",
};

export const instant = false;

async function ActivateAccountContent({
  searchParams,
}: {
  searchParams: Promise<{ code?: string; email?: string }>;
}) {
  const params = await searchParams;
  const code = params.code || "";
  const email = params.email || "";
  return <ActivateAccountForm code={code} email={email} />;
}

export default function ActivateAccountPage({
  searchParams,
}: {
  searchParams: Promise<{ code?: string; email?: string }>;
}) {
  return (
    <Suspense fallback={null}>
      <ActivateAccountContent searchParams={searchParams} />
    </Suspense>
  );
}
