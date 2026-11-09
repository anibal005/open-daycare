import type { FamilyFeedPost } from "@/lib/family-posts";
import { formatFamilyRoomLabel } from "@/lib/family-posts";
import { POST_TYPE_LABELS, POST_TYPE_STYLES } from "@/lib/posts";

const HEART_PATH =
  "M20.8 4.6a5.5 5.5 0 0 0-7.8 0L12 5.7l-1-1.1a5.5 5.5 0 0 0-7.8 7.8l1 1L12 21.2l7.8-7.8 1-1a5.5 5.5 0 0 0 0-7.8z";

const COMMENT_PATH =
  "M21 11.5a8.38 8.38 0 0 1-.9 3.8 8.5 8.5 0 0 1-7.6 4.7 8.38 8.38 0 0 1-3.8-.9L3 21l1.9-5.7a8.38 8.38 0 0 1-.9-3.8 8.5 8.5 0 0 1 4.7-7.6 8.38 8.38 0 0 1 3.8-.9h.5a8.48 8.48 0 0 1 8 8z";

const MEGAPHONE_PATH = "m3 11 18-5v12L3 14v-3zM11.6 16.8a3 3 0 1 1-5.8-1.6";

export default function FamilyPostCard({ post }: { post: FamilyFeedPost }) {
  const styles = POST_TYPE_STYLES[post.type];
  const label = POST_TYPE_LABELS[post.type];
  const roomLabel =
    !post.isAnnouncement && post.roomName
      ? ` · ${formatFamilyRoomLabel(post.roomName)}`
      : "";
  const titleId = `family-post-${post.id}-title`;

  return (
    <article
      aria-labelledby={titleId}
      className="rounded-[20px] border border-line bg-card px-[22px] py-5 shadow-[0_4px_16px_-12px_rgba(120,90,60,.5)]"
    >
      <div className="mb-[14px] flex items-center gap-3">
        {post.isAnnouncement ? (
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
              aria-hidden="true"
              focusable="false"
            >
              <path d={MEGAPHONE_PATH} />
            </svg>
          </div>
        ) : (
          <div
            aria-hidden="true"
            className={`font-fredoka flex size-11 flex-none items-center justify-center rounded-full text-[17px] font-semibold ${styles.avatar}`}
          >
            {post.avatarLetter}
          </div>
        )}
        <div className="min-w-0 flex-1">
          <h3
            id={titleId}
            className="font-fredoka m-0 text-[16.5px] font-semibold text-ink"
          >
            {post.headerName}
          </h3>
          <div className="truncate text-[12.5px] text-muted">
            {post.time} · {post.authorName}
            {roomLabel}
          </div>
        </div>
        <div
          className={`flex flex-none items-center gap-[7px] rounded-full px-3 py-[6px] ${styles.badge}`}
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

      <p className="text-[15.5px] leading-[1.55] text-body-ink">{post.body}</p>

      {post.photos.length > 0 ? (
        <div
          className={
            post.photos.length === 1
              ? "mt-[14px]"
              : "mt-[14px] grid grid-cols-2 gap-2"
          }
        >
          {post.photos.map((photo) => (
            <img
              key={photo.id}
              src={photo.url}
              alt={photo.alt || "Foto de la publicación"}
              width={photo.width ?? undefined}
              height={photo.height ?? undefined}
              loading="lazy"
              decoding="async"
              className={
                post.photos.length === 1
                  ? "max-h-[420px] w-full rounded-[16px] border border-line object-cover"
                  : "aspect-square w-full rounded-[16px] border border-line object-cover"
              }
            />
          ))}
        </div>
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
            focusable="false"
          >
            <path d={HEART_PATH} />
          </svg>
          <span className="sr-only">Me gusta: </span>
          {post.likes}
        </span>
        <span className="flex items-center gap-[7px] text-[14px] font-bold text-[#94887B]">
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
            focusable="false"
          >
            <path d={COMMENT_PATH} />
          </svg>
          <span className="sr-only">Comentarios: </span>
          {post.comments}
        </span>
      </div>
    </article>
  );
}
