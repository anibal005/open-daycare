import AllergyAlert from "@/app/_components/allergy-alert";
import LinkedParents from "@/app/_components/linked-parents";
import Sidebar from "@/app/_components/sidebar";
import { AVATAR_TONES, getAvatarToneForName } from "@/lib/children";
import { createClient } from "@/lib/supabase/server";
import Link from "next/link";
import { notFound } from "next/navigation";
import { connection } from "next/server";

const SUN_PATH =
  "M12 2v2M12 20v2M4.9 4.9l1.4 1.4M17.7 17.7l1.4 1.4M2 12h2M20 12h2M4.9 19.1l1.4-1.4M17.7 6.3l1.4-1.4";

export const instant = false;

// Row shapes used by this page. The Supabase helpers in `lib/supabase/*` are
// not instantiated with the generated `Database` type, so the columns read
// here are declared locally and applied as annotations to each query.
interface ChildProfileRow {
  full_name: string;
  birth_date: string;
  enrolled_at: string;
  medical_notes: string | null;
  rooms: { name: string } | null;
}

interface ParentLinkRow {
  relationship: string;
  user_id: string;
  users: { id: string; full_name: string } | null;
}

interface AcceptedInvitationRow {
  accepted_by_user_id: string | null;
  invited_by: string;
}

interface InviterRow {
  id: string;
  full_name: string;
}

function calculateAgeLabel(birthDate: string) {
  const birth = new Date(birthDate);
  const now = new Date();
  let age = now.getFullYear() - birth.getFullYear();
  const monthDiff = now.getMonth() - birth.getMonth();
  if (monthDiff < 0 || (monthDiff === 0 && now.getDate() < birth.getDate())) {
    age--;
  }
  if (age < 0) age = 0;
  return age === 1 ? "1 año" : `${age} años`;
}

function formatDate(date: string) {
  return new Date(date).toLocaleDateString("es-ES", {
    day: "2-digit",
    month: "short",
    year: "numeric",
  });
}

function formatMonthYear(date: string) {
  return new Date(date).toLocaleDateString("es-ES", {
    month: "short",
    year: "numeric",
  });
}

function mapRelationship(relationship: string) {
  if (relationship === "mother") return "Mamá";
  if (relationship === "father") return "Papá";
  return "Tutor";
}

export default async function KidProfilePage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  await connection();
  const { id } = await params;
  const supabase = await createClient();

  // `.single()` keeps the builder's result type on an untyped client, so the
  // single-row shape is applied to the destructured `data` instead.
  const { data: childRow }: { data: ChildProfileRow | null } = await supabase
    .from("children")
    .select("*, rooms(name)")
    .eq("id", id)
    .eq("status", "active")
    .single();

  if (!childRow) {
    notFound();
  }

  const { data: parentLinks } = await supabase
    .from("parent_children")
    .select("relationship, user_id, users(id, full_name)")
    .eq("child_id", id)
    .overrideTypes<ParentLinkRow[], { merge: false }>();

  const { data: acceptedInvitations } = await supabase
    .from("invitations")
    .select("accepted_by_user_id, invited_by")
    .eq("child_id", id)
    .eq("status", "accepted")
    .overrideTypes<AcceptedInvitationRow[], { merge: false }>();

  const inviterIds = Array.from(
    new Set(
      (acceptedInvitations || [])
        .map((inv) => inv.invited_by)
        .filter(Boolean),
    ),
  );

  let inviters: InviterRow[] = [];
  if (inviterIds.length) {
    const { data: inviterRows } = await supabase
      .from("users")
      .select("id, full_name")
      .in("id", inviterIds)
      .overrideTypes<InviterRow[], { merge: false }>();
    inviters = inviterRows ?? [];
  }

  const inviterMap = new Map(
    inviters.map((inviter) => [inviter.id, inviter.full_name] as const),
  );

  const invitationByAcceptedUser = new Map(
    (acceptedInvitations || []).map(
      (inv) => [inv.accepted_by_user_id, inv.invited_by] as const,
    ),
  );

  const childName = childRow.full_name || "";
  const toneKey = getAvatarToneForName(childName);
  const tone = AVATAR_TONES[toneKey];
  const avatarLetter = childName.charAt(0)?.toUpperCase() || "?";

  const parents =
    parentLinks?.map((link) => {
      const user = link.users;
      const name = user?.full_name || "";
      const userTone = getAvatarToneForName(name);
      const invitedById = invitationByAcceptedUser.get(link.user_id);
      const invitedByName = invitedById ? inviterMap.get(invitedById) : null;
      return {
        name,
        avatarLetter: name.charAt(0)?.toUpperCase() || "?",
        tone: userTone,
        roleLabel: mapRelationship(link.relationship),
        status: "active" as const,
        invitedBy: invitedByName || null,
      };
    }) || [];

  const allergyNote = childRow.medical_notes || undefined;

  const details = [
    { label: "Fecha de nacimiento", value: formatDate(childRow.birth_date) },
    { label: "Sala", value: childRow.rooms?.name || "" },
    { label: "Ingreso", value: formatMonthYear(childRow.enrolled_at) },
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
                  {avatarLetter}
                </div>
                <div className="flex-1">
                  <h1 className="font-fredoka m-0 text-[28px] font-semibold text-ink">
                    {childName}
                  </h1>
                  <p className="mt-[3px] mb-0 text-[15px] text-muted-dark">
                    {calculateAgeLabel(childRow.birth_date)} · Sala{" "}
                    {childRow.rooms?.name || ""}
                  </p>
                </div>
                <a
                  href="#"
                  className="flex-none rounded-[12px] border-[1.5px] border-line bg-card px-4 py-[9px] text-[14px] font-bold text-[#6E6359]"
                >
                  Editar
                </a>
              </div>

              {allergyNote ? <AllergyAlert note={allergyNote} /> : null}

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

              <LinkedParents parents={parents} childName={childName} childId={id} />
            </div>
          </div>
        </div>
      </main>
    </div>
  );
}
