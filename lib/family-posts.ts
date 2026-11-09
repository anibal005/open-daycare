import type { PostType } from "@/lib/posts";

export const FAMILY_TIME_ZONE = "America/Argentina/Buenos_Aires";

export interface FamilyFeedPhoto {
  id: string;
  url: string;
  alt: string | null;
  width: number | null;
  height: number | null;
}

export interface FamilyFeedPost {
  id: string;
  type: PostType;
  headerName: string;
  avatarLetter: string;
  time: string;
  publishedAt: Date;
  timeKey: string;
  authorName: string;
  roomName: string;
  body: string;
  likes: number;
  comments: number;
  photos: FamilyFeedPhoto[];
  childIds: string[];
  isAnnouncement: boolean;
}

export interface FamilyFeedDay {
  key: string;
  label: string;
  posts: FamilyFeedPost[];
}

const timeFormatter = new Intl.DateTimeFormat("es-AR", {
  hour: "2-digit",
  minute: "2-digit",
  hourCycle: "h23",
  timeZone: FAMILY_TIME_ZONE,
});

const dayKeyFormatter = new Intl.DateTimeFormat("en-CA", {
  year: "numeric",
  month: "2-digit",
  day: "2-digit",
  timeZone: FAMILY_TIME_ZONE,
});

const dayLabelFormatter = new Intl.DateTimeFormat("es-AR", {
  weekday: "long",
  day: "2-digit",
  month: "short",
  timeZone: FAMILY_TIME_ZONE,
});

// Room names are stored with the "Sala" prefix ("Sala Soles"), while the card
// copy also prefixes it. Keep a single prefix either way.
export function formatFamilyRoomLabel(roomName: string) {
  if (!roomName) return "";
  return /^sala\b/i.test(roomName) ? roomName : `Sala ${roomName}`;
}

// "A", "A y B", "A, B y C".
export function joinFamilyNames(names: string[]) {
  if (names.length <= 1) return names[0] ?? "";
  return `${names.slice(0, -1).join(", ")} y ${names[names.length - 1]}`;
}

export function formatFamilyTime(isoDate: string) {
  return timeFormatter.format(new Date(isoDate));
}

// `YYYY-MM-DD` in the app time zone. `toISOString()` would use UTC and put
// late-evening posts on the wrong day.
export function formatFamilyDayKey(date: Date) {
  const parts = dayKeyFormatter.formatToParts(date);
  const year = parts.find((part) => part.type === "year")?.value ?? "";
  const month = parts.find((part) => part.type === "month")?.value ?? "";
  const day = parts.find((part) => part.type === "day")?.value ?? "";
  return `${year}-${month}-${day}`;
}

export function formatFamilyDayLabel(date: Date, todayKey: string) {
  const parts = dayLabelFormatter.formatToParts(date);
  const weekday = parts.find((part) => part.type === "weekday")?.value ?? "";
  const day = parts.find((part) => part.type === "day")?.value ?? "";
  const month = parts.find((part) => part.type === "month")?.value ?? "";
  const label = `${weekday} ${day} ${month}`.toUpperCase();
  return formatFamilyDayKey(date) === todayKey ? `HOY · ${label}` : label;
}

// Posts arrive newest-first from the query; grouping keeps that order.
export function groupFamilyDays(
  posts: FamilyFeedPost[],
  now: Date = new Date(),
): FamilyFeedDay[] {
  const todayKey = formatFamilyDayKey(now);
  const days: FamilyFeedDay[] = [];
  const byKey = new Map<string, FamilyFeedDay>();

  for (const post of posts) {
    const key = post.timeKey;
    const existing = byKey.get(key);

    if (existing) {
      existing.posts.push(post);
      continue;
    }

    const day: FamilyFeedDay = {
      key,
      label: formatFamilyDayLabel(post.publishedAt, todayKey),
      posts: [post],
    };
    byKey.set(key, day);
    days.push(day);
  }

  return days;
}

// Filter semantics: choosing a child shows posts for that child plus
// whole-room posts (no visible recipients). RLS already removed other families.
export function filterFamilyPosts(posts: FamilyFeedPost[], childId: string | null) {
  if (!childId) return posts;
  return posts.filter(
    (post) => post.childIds.length === 0 || post.childIds.includes(childId),
  );
}
