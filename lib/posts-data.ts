import type { FeedPost, FeedPostPhoto, PostType } from "@/lib/posts";
import { createClient } from "@/lib/supabase/server";

const APP_TIME_ZONE = "America/Argentina/Buenos_Aires";
const FEED_LIMIT = 50;
const SIGNED_URL_TTL_SECONDS = 3600;

// Row shapes read by the feed. The Supabase helpers in `lib/supabase/*` are not
// instantiated with the generated `Database` type, so the columns used here are
// declared locally (same pattern as `app/kid/[id]/page.tsx`).
interface FeedPostRow {
  id: string;
  type: PostType;
  body: string;
  published_at: string;
  author_id: string;
  post_children: Array<{ children: { id: string; full_name: string } | null }>;
  post_photos: Array<{
    id: string;
    storage_path: string;
    alt: string | null;
    width: number | null;
    height: number | null;
    position: number;
  }>;
  reactions: Array<{ count: number }>;
  comments: Array<{ count: number }>;
}

export type FeedPostsResult =
  | { ok: true; posts: FeedPost[] }
  | { ok: false };

const timeFormatter = new Intl.DateTimeFormat("es-AR", {
  hour: "2-digit",
  minute: "2-digit",
  hourCycle: "h23",
  timeZone: APP_TIME_ZONE,
});

// "A", "A y B", "A, B y C".
function joinNames(names: string[]) {
  if (names.length <= 1) return names[0] ?? "";
  return `${names.slice(0, -1).join(", ")} y ${names[names.length - 1]}`;
}

function mapRowToFeedPost(
  row: FeedPostRow,
  userId: string | undefined,
  signedUrlByPath: Map<string, string>,
): FeedPost {
  const names = (row.post_children ?? [])
    .map((link) => link.children?.full_name.split(" ")[0])
    .filter((name): name is string => Boolean(name))
    .sort((a, b) => a.localeCompare(b, "es"));
  const joinedNames = joinNames(names);

  const headerName =
    row.type === "announcement"
      ? "Anuncio general"
      : joinedNames || "Toda la sala";

  const photos: FeedPostPhoto[] = (row.post_photos ?? [])
    .slice()
    .sort((a, b) => a.position - b.position)
    .flatMap((photo) => {
      const url = signedUrlByPath.get(photo.storage_path);
      // A photo without a live signed URL is skipped: rendering a broken
      // <img> is worse than showing the post without it.
      if (!url) return [];
      return [
        {
          id: photo.id,
          url,
          alt: photo.alt,
          width: photo.width,
          height: photo.height,
        },
      ];
    });

  return {
    id: row.id,
    type: row.type,
    headerName,
    avatarLetter:
      row.type === "announcement"
        ? ""
        : (headerName.charAt(0).toUpperCase() ?? ""),
    time: timeFormatter.format(new Date(row.published_at)),
    authorLabel:
      row.author_id === userId
        ? "publicado por vos"
        : "publicado por el equipo",
    audience: joinedNames
      ? `Para: familia de ${joinedNames}`
      : "Para: toda la sala",
    body: row.body,
    likes: row.reactions?.[0]?.count ?? 0,
    comments: row.comments?.[0]?.count ?? 0,
    photos,
  };
}

export async function getFeedPosts(): Promise<FeedPostsResult> {
  const supabase = await createClient();

  const {
    data: { user },
  } = await supabase.auth.getUser();

  const { data, error } = await supabase
    .from("posts")
    .select(
      "id, type, body, published_at, author_id, " +
        "post_children(children(id, full_name)), " +
        "post_photos(id, storage_path, alt, width, height, position), " +
        "reactions(count), comments(count)",
    )
    .order("published_at", { ascending: false })
    .limit(FEED_LIMIT);

  if (error) {
    console.error("[feed] Failed to load posts", error.code);
    return { ok: false };
  }

  const rows = (data ?? []) as unknown as FeedPostRow[];
  const photoPaths = Array.from(
    new Set(
      rows.flatMap((row) =>
        (row.post_photos ?? []).map((photo) => photo.storage_path),
      ),
    ),
  );

  const signedUrlByPath = new Map<string, string>();

  if (photoPaths.length > 0) {
    const { data: signedUrls, error: signedUrlsError } = await supabase.storage
      .from("post-photos")
      .createSignedUrls(photoPaths, SIGNED_URL_TTL_SECONDS);

    if (signedUrlsError) {
      console.error("[feed] Failed to sign photo URLs", signedUrlsError.name);
    } else {
      for (const item of signedUrls ?? []) {
        if (item.error || !item.signedUrl || !item.path) continue;
        signedUrlByPath.set(item.path, item.signedUrl);
      }
    }
  }

  return {
    ok: true,
    posts: rows.map((row) => mapRowToFeedPost(row, user?.id, signedUrlByPath)),
  };
}
