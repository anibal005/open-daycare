import AllergyAlert from "@/app/_components/allergy-alert";
import LinkedParents from "@/app/_components/linked-parents";
import Sidebar from "@/app/_components/sidebar";
import { AVATAR_TONES, children } from "@/lib/children";
import Link from "next/link";
import { notFound } from "next/navigation";

const SUN_PATH =
  "M12 2v2M12 20v2M4.9 4.9l1.4 1.4M17.7 17.7l1.4 1.4M2 12h2M20 12h2M4.9 19.1l1.4-1.4M17.7 6.3l1.4-1.4";

// Blocking route: only unlisted ids round-trip to the server (404).
// The 8 generated paths stay fully prerendered and instant.
export const instant = false;

export function generateStaticParams() {
  return children.map((child) => ({ id: child.id }));
}

export default async function KidProfilePage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  const child = children.find((child) => child.id === id);

  if (!child) {
    notFound();
  }

  const tone = AVATAR_TONES[child.tone];
  const { profile } = child;

  const details = [
    { label: "Fecha de nacimiento", value: profile.birthDate },
    { label: "Sala", value: profile.room },
    { label: "Ingreso", value: profile.admission },
  ];

  return (
    <div className="flex min-h-screen bg-cream">
      <Sidebar activeItem="kids" />

      <main className="h-screen flex-1 min-w-0 overflow-y-auto">
        <div className="mx-auto w-full max-w-[820px] px-10 pt-[34px] pb-20">
          <Link
            href="/kid"
            className="mb-5 flex items-center gap-[1.5px] text-[14px] font-bold text-muted-dark"
          >
            <svg
              width="18"
              height="18"
              viewBox="0 0 24 24"
              fill="none"
              stroke="currentColor"
              strokeWidth="2.2"
              strokeLinecap="round"
              strokeLinejoin="round"
              className="flex-none"
            >
              <path d="m15 18-6-6 6-6" />
            </svg>
            Volver a Niños
          </Link>

          <div className="flex flex-wrap items-start gap-[26px]">
            <div className="flex min-w-[300px] flex-1 flex-col gap-[18px]">
              <div className="flex items-center gap-[18px]">
                <div
                  className={`font-fredoka flex size-[84px] flex-none items-center justify-center rounded-full text-[34px] font-semibold ${tone.bg} ${tone.text}`}
                >
                  {child.avatarLetter}
                </div>
                <div className="flex-1">
                  <h1 className="font-fredoka m-0 text-[28px] font-semibold text-ink">
                    {child.name}
                  </h1>
                  <p className="mt-[3px] mb-0 text-[15px] text-muted-dark">
                    {child.ageLabel} · Sala {profile.room}
                  </p>
                </div>
                <a
                  href="#"
                  className="flex-none rounded-[12px] border-[1.5px] border-line bg-card px-4 py-[9px] text-[14px] font-bold text-[#6E6359]"
                >
                  Editar
                </a>
              </div>

              {profile.allergyNote ? (
                <AllergyAlert note={profile.allergyNote} />
              ) : null}

              <div className="overflow-hidden rounded-[16px] border border-line bg-card">
                {details.map((detail, index) => (
                  <div
                    key={detail.label}
                    className={`flex justify-between px-[18px] py-[15px] ${
                      index < details.length - 1
                        ? "border-b border-line-soft"
                        : ""
                    }`}
                  >
                    <span className="text-[14.5px] text-muted-dark">
                      {detail.label}
                    </span>
                    <span className="text-[14.5px] font-extrabold text-ink">
                      {detail.value}
                    </span>
                  </div>
                ))}
              </div>
            </div>

            <div className="flex w-[300px] flex-none flex-col gap-[14px]">
              <a
                href="#"
                className="flex w-full items-center justify-center gap-[9px] rounded-[14px] bg-ink p-[13px] text-[15px] font-extrabold text-white"
              >
                <svg
                  width="18"
                  height="18"
                  viewBox="0 0 24 24"
                  fill="none"
                  stroke="#fff"
                  strokeWidth="2"
                  strokeLinecap="round"
                  strokeLinejoin="round"
                >
                  <circle cx="12" cy="12" r="4" />
                  <path d={SUN_PATH} />
                </svg>
                Resumen del día
              </a>

              <LinkedParents
                parents={profile.parents}
                childName={child.name}
              />
            </div>
          </div>
        </div>
      </main>
    </div>
  );
}
