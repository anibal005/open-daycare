import FamilyPostCard from "@/app/_components/family-post-card";
import { AVATAR_TONES, getAvatarToneForName } from "@/lib/children";
import { getFamilyFeedPosts } from "@/lib/family-feed-data";
import { filterFamilyPosts, groupFamilyDays } from "@/lib/family-posts";
import { getFamilyContext, type FamilyChild } from "@/lib/session-profile";
import Link from "next/link";
import { redirect } from "next/navigation";
import { Suspense } from "react";
import { connection } from "next/server";

// This segment reads `searchParams` and the session cookies on every request.
export const instant = false;

function resolveSelectedChildId(
  children: FamilyChild[],
  rawChild: string | string[] | undefined,
) {
  const requested = Array.isArray(rawChild) ? rawChild[0] : rawChild;

  // A child id that is not linked to this parent is treated as "Todos": RLS
  // would return nothing extra anyway, and the URL stays harmless.
  if (requested && children.some((child) => child.id === requested)) {
    return requested;
  }

  // With a single linked child there is no "Todos" chip, so that child is the
  // default filter.
  return children.length === 1 ? children[0].id : null;
}

function FamilyChips({
  linkedChildren,
  selectedChildId,
}: {
  linkedChildren: FamilyChild[];
  selectedChildId: string | null;
}) {
  return (
    <div
      role="group"
      aria-label="Filtrar publicaciones por niño"
      className="mb-[22px] flex flex-wrap gap-[10px]"
    >
      {linkedChildren.map((child) => {
        const active = selectedChildId === child.id;
        const tone = AVATAR_TONES[getAvatarToneForName(child.firstName)];

        return (
          <Link
            key={child.id}
            href={`/family?child=${child.id}`}
            aria-current={active ? "true" : undefined}
            className={
              active
                ? "flex items-center gap-2 rounded-full border-[1.5px] border-ink bg-ink py-[7px] pr-[15px] pl-2 text-[14px] font-bold text-white"
                : "flex items-center gap-2 rounded-full border-[1.5px] border-line bg-card py-[7px] pr-[15px] pl-2 text-[14px] font-bold text-[#6E6359]"
            }
          >
            <span
              aria-hidden="true"
              className={`font-fredoka flex size-[26px] flex-none items-center justify-center rounded-full text-[13px] font-semibold ${tone.bg} ${tone.text}`}
            >
              {child.firstName.charAt(0).toUpperCase()}
            </span>
            {child.firstName}
          </Link>
        );
      })}

      {linkedChildren.length > 1 ? (
        <Link
          href="/family"
          aria-current={selectedChildId === null ? "true" : undefined}
          className={
            selectedChildId === null
              ? "rounded-full border-[1.5px] border-ink bg-ink px-4 py-[7px] text-[14px] font-bold text-white"
              : "rounded-full border-[1.5px] border-line bg-card px-4 py-[7px] text-[14px] font-bold text-[#6E6359]"
          }
        >
          Todos
        </Link>
      ) : null}
    </div>
  );
}

function FamilyFeedSkeleton() {
  return (
    <div role="status" className="flex flex-col gap-4">
      <span className="sr-only">Cargando publicaciones…</span>
      <div
        aria-hidden="true"
        className="h-[180px] animate-pulse rounded-[20px] border border-line bg-card"
      />
      <div
        aria-hidden="true"
        className="h-[180px] animate-pulse rounded-[20px] border border-line bg-card"
      />
    </div>
  );
}

async function FamilyFeedContent({
  linkedChildren,
  selectedChildId,
}: {
  linkedChildren: FamilyChild[];
  selectedChildId: string | null;
}) {
  await connection();
  const result = await getFamilyFeedPosts(linkedChildren);

  if (!result.ok) {
    return (
      <div
        role="alert"
        className="rounded-[20px] border border-line bg-card px-6 py-10 text-center"
      >
        <div className="font-fredoka text-[18px] font-semibold text-ink">
          No se pudieron cargar las publicaciones
        </div>
        <p className="mt-1 mb-0 text-[14px] text-muted-dark">
          Actualizá la página para reintentar.
        </p>
      </div>
    );
  }

  const posts = filterFamilyPosts(result.posts, selectedChildId);

  if (posts.length === 0) {
    return (
      <div className="rounded-[20px] border-[1.5px] border-dashed border-[#DBCDBA] bg-card px-6 py-12 text-center">
        <div className="font-fredoka text-[18px] font-semibold text-ink">
          Todavía no hay publicaciones
        </div>
        <p className="mt-1 mb-0 text-[14px] text-muted-dark">
          Cuando la guardería comparta un momento del día, lo vas a ver acá.
        </p>
      </div>
    );
  }

  return (
    <div className="flex flex-col gap-5">
      {groupFamilyDays(posts).map((day) => (
        <section key={day.key}>
          <div className="mb-[14px] flex items-center gap-[14px]">
            <h2 className="text-[12.5px] font-extrabold tracking-[.8px] text-[#8A7C6D]">
              {day.label}
            </h2>
            <span className="h-px flex-1 bg-[#E7DAC8]" />
          </div>

          <div className="flex flex-col gap-4">
            {day.posts.map((post) => (
              <FamilyPostCard key={post.id} post={post} />
            ))}
          </div>
        </section>
      ))}
    </div>
  );
}

export default async function FamilyFeedPage({
  searchParams,
}: PageProps<"/family">) {
  const context = await getFamilyContext();

  if (!context) redirect("/access-denied");

  const params = await searchParams;
  const selectedChildId = resolveSelectedChildId(context.children, params.child);
  const firstName =
    context.profile.fullName.split(" ")[0] || context.profile.fullName;

  return (
    <div className="mx-auto w-full max-w-[720px] px-10 pt-[34px] pb-20">
      <div className="mb-5">
        <div className="mb-1 text-[12.5px] font-extrabold tracking-[.8px] text-coral-dark">
          TU FAMILIA
        </div>
        <h1 className="font-fredoka m-0 text-[30px] font-semibold text-ink">
          Hola, {firstName}
        </h1>
        <p className="mt-[5px] mb-0 text-[14.5px] text-muted-dark">
          Así va el día de hoy
        </p>
      </div>

      <FamilyChips
        linkedChildren={context.children}
        selectedChildId={selectedChildId}
      />

      <Suspense fallback={<FamilyFeedSkeleton />}>
        <FamilyFeedContent
          linkedChildren={context.children}
          selectedChildId={selectedChildId}
        />
      </Suspense>
    </div>
  );
}
