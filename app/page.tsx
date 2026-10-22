import CreatePostModal from "@/app/_components/create-post-modal";
import PostCard from "@/app/_components/post-card";
import Sidebar from "@/app/_components/sidebar";
import { posts } from "@/lib/posts";

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
              PUBLICADO HOY
            </span>
            <span className="h-px flex-1 bg-[#E7DAC8]" />
          </div>

          <div className="flex flex-col gap-4">
            {posts.map((post) => (
              <PostCard key={post.id} post={post} />
            ))}
          </div>
        </div>
      </main>
    </div>
  );
}
