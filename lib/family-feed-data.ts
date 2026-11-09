import {
  formatFamilyDayKey,
  formatFamilyTime,
  joinFamilyNames,
  type FamilyFeedPhoto,
  type FamilyFeedPost,
} from "@/lib/family-posts";
import type { FamilyChild } from "@/lib/session-profile";
import type { PostType } from "@/lib/posts";
import { createClient } from "@/lib/supabase/server";

const FEED_LIMIT = 50;
const SIGNED_URL_TTL_SECONDS = 3600;

// Row shapes read by the family feed. The Supabase helpers in `lib/supabase/*`
// are not instantiated with the generated `Database` type, so the columns used
// here are declared locally (same pattern as `lib/posts-data.ts`).
interface FamilyFeedChildRow {
  id: string;
  full_name: string;
  rooms: { name: string } | null;
}

interface FamilyFeedRow {
  id: string;
  type: PostType;
  body: string;
  published_at: string;
  post_children: Array<{ children: FamilyFeedChildRow | null }>;
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
  author: { full_name: string; avatar_url: string | null } | null;
}

export type FamilyFeedResult =
  | { ok: true; posts: FamilyFeedPost[] }
  | { ok: false };

// Whole-room posts have no `post_children` rows, so their room cannot be read
// from the post. The family context supplies it when every linked child shares
// the same room.
function resolveFallbackRoom(children: FamilyChild[]) {
  const rooms = Array.from(
    new Set(children.map((child) => child.roomName).filter(Boolean)),
  );
  return rooms.length === 1 ? rooms[0] : "";
}

function mapRowToFamilyPost(
  row: FamilyFeedRow,
  fallbackRoom: string,
  signedUrlByPath: Map<string, string>,
): FamilyFeedPost {
  const visibleChildren = (row.post_children ?? []).flatMap((link) =>
    link.children ? [link.children] : [],
  );

  const names = visibleChildren
    .map((child) => child.full_name.split(" ")[0])
    .filter((name): name is string => Boolean(name))
    .sort((a, b) => a.localeCompare(b, "es"));

  const isAnnouncement = row.type === "announcement";
  const headerName = isAnnouncement
    ? "Anuncio general"
    : joinFamilyNames(names) || "Toda la sala";

  const visibleRooms = visibleChildren
    .map((child) => child.rooms?.name)
    .filter((name): name is string => Boolean(name));

  const photos: FamilyFeedPhoto[] = (row.post_photos ?? [])
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

  const publishedAt = new Date(row.published_at);

  return {
    id: row.id,
    type: row.type,
    headerName,
    avatarLetter: isAnnouncement
      ? ""
      : headerName.charAt(0).toUpperCase() || "?",
    time: formatFamilyTime(row.published_at),
    publishedAt,
    timeKey: formatFamilyDayKey(publishedAt),
    authorName: row.author?.full_name?.trim() || "Equipo",
    roomName: visibleRooms[0] ?? fallbackRoom,
    body: row.body,
    likes: row.reactions?.[0]?.count ?? 0,
    comments: row.comments?.[0]?.count ?? 0,
    photos,
    childIds: visibleChildren.map((child) => child.id),
    isAnnouncement,
  };
}

export async function getFamilyFeedPosts(
  children: FamilyChild[],
): Promise<FamilyFeedResult> {
  const supabase = await createClient();

  const { data, error } = await supabase
    .from("posts")
    .select(
      "id, type, body, published_at, author_id, " +
        "post_children(children(id, full_name, rooms(name))), " +
        "post_photos(id, storage_path, alt, width, height, position), " +
        "reactions(count), comments(count), " +
        "author:users!posts_author_id_fkey(full_name, avatar_url)",
    )
    .order("published_at", { ascending: false })
    .limit(FEED_LIMIT);

  if (error) {
    console.error("[family-feed] Failed to load posts", error.code);
    return { ok: false };
  }

  const rows = (data ?? []) as unknown as FamilyFeedRow[];
  const fallbackRoom = resolveFallbackRoom(children);

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
      console.error(
        "[family-feed] Failed to sign photo URLs",
        signedUrlsError.name,
      );
    } else {
      for (const item of signedUrls ?? []) {
        if (item.error || !item.signedUrl || !item.path) continue;
        signedUrlByPath.set(item.path, item.signedUrl);
      }
    }
  }

  return {
    ok: true,
    posts: rows.map((row) =>
      mapRowToFamilyPost(row, fallbackRoom, signedUrlByPath),
    ),
  };
}
