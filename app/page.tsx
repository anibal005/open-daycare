import PostCard from "@/app/_components/post-card";
import Sidebar from "@/app/_components/sidebar";
import { posts } from "@/lib/posts";

const CAMERA_PATH =
  "M23 19a2 2 0 0 1-2 2H3a2 2 0 0 1-2-2V8a2 2 0 0 1 2-2h4l2-3h6l2 3h4a2 2 0 0 1 2 2z";

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

          <a
            href="#"
            className="mb-6 flex items-center gap-[14px] rounded-[18px] border border-line bg-card px-[18px] py-[14px] shadow-[0_4px_14px_-10px_rgba(120,90,60,.4)]"
          >
            <div className="font-fredoka flex size-10 flex-none items-center justify-center rounded-full bg-coral text-[16px] font-semibold text-white">
              C
            </div>
            <span className="flex-1 text-[15px] text-muted">
              Compartí un momento…
            </span>
            <span className="flex size-[38px] items-center justify-center rounded-[12px] bg-coral-soft text-[#E0654A]">
              <svg
                width="19"
                height="19"
                viewBox="0 0 24 24"
                fill="none"
                stroke="currentColor"
                strokeWidth="2"
                strokeLinecap="round"
                strokeLinejoin="round"
              >
                <path d={CAMERA_PATH} />
                <circle cx="12" cy="13" r="4" />
              </svg>
            </span>
          </a>

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
