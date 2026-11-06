import CreatePostModal from "@/app/_components/create-post-modal";
import PostCard from "@/app/_components/post-card";
import Sidebar from "@/app/_components/sidebar";
import { getFeedPosts } from "@/lib/posts-data";
import { Suspense } from "react";
import { connection } from "next/server";

async function FeedContent() {
  await connection();
  const result = await getFeedPosts();

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

  if (result.posts.length === 0) {
    return (
      <div className="rounded-[20px] border-[1.5px] border-dashed border-[#DBCDBA] bg-card px-6 py-12 text-center">
        <div className="font-fredoka text-[18px] font-semibold text-ink">
          Todavía no hay publicaciones
        </div>
        <p className="mt-1 mb-0 text-[14px] text-muted-dark">
          Compartí el primer momento del día con las familias.
        </p>
      </div>
    );
  }

  return (
    <div className="flex flex-col gap-4">
      {result.posts.map((post) => (
        <PostCard key={post.id} post={post} />
      ))}
    </div>
  );
}

function FeedSkeleton() {
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

export default function HomePage() {
  return (
    <div className="flex min-h-screen bg-cream">
      <Sidebar />

      <main className="h-screen flex-1 min-w-0 overflow-y-auto">
        <div className="mx-auto w-full max-w-[760px] px-10 pt-[34px] pb-20">
          <div className="mb-6">
            <div className="mb-1 text-[12.5px] font-extrabold tracking-[.8px] text-coral-dark">
              GUARDERÍA · SALA SOLES
            </div>
            <h1 className="font-fredoka m-0 text-[30px] font-semibold text-ink">
              Buenas, Caro
            </h1>
            <p className="mt-[5px] mb-0 text-[14.5px] text-muted-dark">
              12 niños · martes 17 jun
            </p>
          </div>

          <CreatePostModal variant="feedBar" />

          <div className="mb-[14px] flex items-center gap-[14px]">
            <span className="text-[12.5px] font-extrabold tracking-[.8px] text-[#8A7C6D]">
              PUBLICACIONES
            </span>
            <span className="h-px flex-1 bg-[#E7DAC8]" />
          </div>

          <Suspense fallback={<FeedSkeleton />}>
            <FeedContent />
          </Suspense>
        </div>
      </main>
    </div>
  );
}
