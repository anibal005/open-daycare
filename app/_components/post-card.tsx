import type { Post } from "@/lib/posts";
import { POST_TYPE_LABELS, POST_TYPE_STYLES } from "@/lib/posts";

const HEART_PATH =
  "M20.8 4.6a5.5 5.5 0 0 0-7.8 0L12 5.7l-1-1.1a5.5 5.5 0 0 0-7.8 7.8l1 1L12 21.2l7.8-7.8 1-1a5.5 5.5 0 0 0 0-7.8z";

const COMMENT_PATH =
  "M21 11.5a8.38 8.38 0 0 1-.9 3.8 8.5 8.5 0 0 1-7.6 4.7 8.38 8.38 0 0 1-3.8-.9L3 21l1.9-5.7a8.38 8.38 0 0 1-.9-3.8 8.5 8.5 0 0 1 4.7-7.6 8.38 8.38 0 0 1 3.8-.9h.5a8.48 8.48 0 0 1 8 8z";

const MEGAPHONE_PATH = "m3 11 18-5v12L3 14v-3zM11.6 16.8a3 3 0 1 1-5.8-1.6";

const IMAGE_PATH_RECT = { x: 3, y: 3, width: 18, height: 18, rx: 2 };
const IMAGE_REST_PATH = "m21 15-3.6-3.6a2 2 0 0 0-2.8 0L6 21";

export default function PostCard({ post }: { post: Post }) {
  const styles = POST_TYPE_STYLES[post.type];
  const label = POST_TYPE_LABELS[post.type];

  return (
    <article className="rounded-[20px] border border-line bg-card px-[22px] py-5 shadow-[0_4px_16px_-12px_rgba(120,90,60,.5)]">
      <div className="mb-[14px] flex items-center gap-3">
        {post.type === "announcement" ? (
          <div
            className={`flex size-11 flex-none items-center justify-center rounded-full ${styles.avatar}`}
          >
            <svg
              width="20"
              height="20"
              viewBox="0 0 24 24"
              fill="none"
              stroke="currentColor"
              strokeWidth="2"
              strokeLinecap="round"
              strokeLinejoin="round"
            >
              <path d={MEGAPHONE_PATH} />
            </svg>
          </div>
        ) : (
          <div
            className={`font-fredoka flex size-11 flex-none items-center justify-center rounded-full text-[17px] font-semibold ${styles.avatar}`}
          >
            {post.avatarLetter}
          </div>
        )}
        <div className="flex-1">
          <div className="font-fredoka text-[16.5px] font-semibold text-ink">
            {post.childName}
          </div>
          <div className="text-[12.5px] text-muted">
            {post.time} · {post.authorLabel}
          </div>
        </div>
        <div
          className={`flex items-center gap-[7px] rounded-full px-3 py-[6px] ${styles.badge}`}
        >
          <span
            className={`size-2 rounded-full ${styles.dot}`}
            aria-hidden="true"
          />
          <span
            className={`text-[12px] font-extrabold tracking-[.5px] ${styles.label}`}
          >
            {label}
          </span>
        </div>
      </div>

      <div className="mb-[10px] text-[12.5px] text-muted">{post.audience}</div>

      <p className="text-[15.5px] leading-[1.55] text-body-ink">{post.text}</p>

      {post.photo ? (
        <a
          href="#"
          className="mt-[14px] flex h-[200px] flex-col items-center justify-center gap-2 rounded-[16px] border-[1.5px] border-dashed border-[#DBCDBA] bg-[#F4ECE1] text-[#B0A290]"
        >
          <svg
            width="30"
            height="30"
            viewBox="0 0 24 24"
            fill="none"
            stroke="currentColor"
            strokeWidth="1.7"
            strokeLinecap="round"
            strokeLinejoin="round"
          >
            <rect {...IMAGE_PATH_RECT} />
            <circle cx="9" cy="9" r="2" />
            <path d={IMAGE_REST_PATH} />
          </svg>
          <span className="text-[13.5px]">{post.photo.caption}</span>
        </a>
      ) : null}

      <div className="mt-4 flex items-center gap-[18px] border-t border-line-soft pt-[14px]">
        <span className="flex items-center gap-[7px] text-[14px] font-bold text-[#E0654A]">
          <svg
            width="19"
            height="19"
            viewBox="0 0 24 24"
            fill="#E0654A"
            stroke="currentColor"
            strokeWidth="2"
            strokeLinecap="round"
            strokeLinejoin="round"
            aria-hidden="true"
          >
            <path d={HEART_PATH} />
          </svg>
          {post.likes}
        </span>
        <a
          href="#"
          className="flex items-center gap-[7px] text-[14px] font-bold text-[#94887B]"
        >
          <svg
            width="18"
            height="18"
            viewBox="0 0 24 24"
            fill="none"
            stroke="currentColor"
            strokeWidth="2"
            strokeLinecap="round"
            strokeLinejoin="round"
            aria-hidden="true"
          >
            <path d={COMMENT_PATH} />
          </svg>
          {post.comments}
        </a>
        <span className="flex-1" />
        <a href="#" className="text-[14px] font-extrabold text-[#C5503A]">
          Editar
        </a>
      </div>
    </article>
  );
}
