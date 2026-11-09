// Internal identifiers in English; Spanish labels are display-only.
export type PostType =
  | "meal" // Comida
  | "nap" // Siesta
  | "activity" // Actividad
  | "achievement" // Logro
  | "mood" // Ánimo
  | "photo" // Foto
  | "announcement"; // Anuncio

export interface FeedPostPhoto {
  id: string;
  url: string; // signed URL (valid for 1 hour)
  alt: string | null;
  width: number | null;
  height: number | null;
}

export interface FeedPost {
  id: string;
  type: PostType;
  headerName: string; // "Thiago" | "Thiago y Celeste" | "Anuncio general" | "Toda la sala"
  avatarLetter: string; // first letter of headerName, "" for announcements
  time: string; // "14:20"
  authorLabel: string; // "publicado por vos" | "publicado por el equipo"
  audience: string; // "Para: familia de Thiago" | "Para: toda la sala"
  body: string;
  likes: number;
  comments: number;
  photos: FeedPostPhoto[]; // 0..2, ordered by position
}

// Visual order of the type chips in the "Nueva publicación" modal (mockup order).
export const POST_TYPE_ORDER: PostType[] = [
  "meal",
  "nap",
  "activity",
  "achievement",
  "mood",
  "photo",
  "announcement",
];

export const POST_TYPE_LABELS: Record<PostType, string> = {
  meal: "COMIDA",
  nap: "SIESTA",
  activity: "ACTIVIDAD",
  achievement: "LOGRO",
  mood: "ÁNIMO",
  photo: "FOTO",
  announcement: "ANUNCIO",
};

export const POST_TYPE_CHIP_LABELS: Record<PostType, string> = {
  meal: "Comida",
  nap: "Siesta",
  activity: "Actividad",
  achievement: "Logro",
  mood: "Ánimo",
  photo: "Foto",
  announcement: "Anuncio",
};

// Chip colors for the create-post modal: `rest` is the pastel (unselected),
// `selected` is the solid accent with white text.
export const POST_TYPE_CHIP_STYLES: Record<
  PostType,
  { rest: string; selected: string }
> = {
  meal: {
    rest: "bg-[#F7E7A6] text-[#9A7B1E]",
    selected: "bg-[#9A7B1E] text-white",
  },
  nap: {
    rest: "bg-[#E7DCF6] text-[#7B5FC0]",
    selected: "bg-[#7B5FC0] text-white",
  },
  activity: {
    rest: "bg-[#C7E7F1] text-[#2E89A6]",
    selected: "bg-[#2E89A6] text-white",
  },
  achievement: {
    rest: "bg-[#CFEBD8] text-[#3E9B6C]",
    selected: "bg-[#3E9B6C] text-white",
  },
  mood: {
    rest: "bg-[#F9D2DE] text-[#C56486]",
    selected: "bg-[#C56486] text-white",
  },
  photo: {
    rest: "bg-[#FBD8CC] text-[#D9684A]",
    selected: "bg-[#D9684A] text-white",
  },
  announcement: {
    rest: "bg-[#CCD8F4] text-[#4E72C8]",
    selected: "bg-[#4E72C8] text-white",
  },
};

export const POST_TYPE_STYLES: Record<
  PostType,
  {
    avatar: string; // avatar circle background + text color
    badge: string; // badge pill background
    dot: string; // badge dot background
    label: string; // badge label text color
  }
> = {
  meal: {
    avatar: "bg-[#F4DC8E] text-[#9A7B1E]",
    badge: "bg-[#F7E7A6]",
    dot: "bg-[#9A7B1E]",
    label: "text-[#9A7B1E]",
  },
  nap: {
    avatar: "bg-[#C9B6E8] text-[#7B5FC0]",
    badge: "bg-[#E7DCF6]",
    dot: "bg-[#7B5FC0]",
    label: "text-[#7B5FC0]",
  },
  activity: {
    avatar: "bg-[#A9D9E8] text-[#1F7A93]",
    badge: "bg-[#C7E7F1]",
    dot: "bg-[#2E89A6]",
    label: "text-[#2E89A6]",
  },
  achievement: {
    avatar: "bg-[#A9D9E8] text-[#1F7A93]",
    badge: "bg-[#CFEBD8]",
    dot: "bg-[#3E9B6C]",
    label: "text-[#3E9B6C]",
  },
  mood: {
    avatar: "bg-[#F4B8CC] text-[#C56486]",
    badge: "bg-[#F9D2DE]",
    dot: "bg-[#C56486]",
    label: "text-[#C56486]",
  },
  photo: {
    avatar: "bg-[#FBD8CC] text-[#D9684A]",
    badge: "bg-[#FBD8CC]",
    dot: "bg-[#D9684A]",
    label: "text-[#D9684A]",
  },
  announcement: {
    avatar: "bg-[#CCD8F4] text-[#4E72C8]",
    badge: "bg-[#CCD8F4]",
    dot: "bg-[#4E72C8]",
    label: "text-[#4E72C8]",
  },
};
