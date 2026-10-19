// Internal identifiers in English; Spanish labels are display-only.
export type PostType = "achievement" | "activity" | "announcement";

export interface PostPhoto {
  alt: string;
  caption: string;
}

export interface Post {
  id: string;
  type: PostType;
  childName: string; // "Mateo"
  avatarLetter: string; // "M"
  time: string; // "14:20"
  authorLabel: string; // "publicado por vos"
  audience: string; // "Para: familia de Mateo" | "Para: toda la sala"
  text: string; // post body
  likes: number;
  comments: number;
  photo?: PostPhoto; // only on "activity"
}

export const POST_TYPE_LABELS: Record<PostType, string> = {
  achievement: "LOGRO",
  activity: "ACTIVIDAD",
  announcement: "ANUNCIO",
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
  achievement: {
    avatar: "bg-[#A9D9E8] text-[#1F7A93]",
    badge: "bg-[#CFEBD8]",
    dot: "bg-[#3E9B6C]",
    label: "text-[#3E9B6C]",
  },
  activity: {
    avatar: "bg-[#A9D9E8] text-[#1F7A93]",
    badge: "bg-[#C7E7F1]",
    dot: "bg-[#2E89A6]",
    label: "text-[#2E89A6]",
  },
  announcement: {
    avatar: "bg-[#CCD8F4] text-[#4E72C8]",
    badge: "bg-[#CCD8F4]",
    dot: "bg-[#4E72C8]",
    label: "text-[#4E72C8]",
  },
};

export const posts: Post[] = [
  {
    id: "post-achievement-mateo",
    type: "achievement",
    childName: "Mateo",
    avatarLetter: "M",
    time: "14:20",
    authorLabel: "publicado por vos",
    audience: "Para: familia de Mateo",
    text: "¡Usó el orinal solito por primera vez! Estaba feliz de contárselo a todos. Un gran paso.",
    likes: 3,
    comments: 1,
  },
  {
    id: "post-activity-mateo",
    type: "activity",
    childName: "Mateo",
    avatarLetter: "M",
    time: "09:40",
    authorLabel: "publicado por vos",
    audience: "Para: familia de Mateo",
    text: "Pintamos con témperas esta mañana. Mateo eligió el azul para todo y se concentró un montón mezclando colores.",
    likes: 5,
    comments: 2,
    photo: {
      alt: "Mateo pintando con témperas",
      caption: "Foto · pintando con témperas",
    },
  },
  {
    id: "post-announcement-sala",
    type: "announcement",
    childName: "Anuncio general",
    avatarLetter: "",
    time: "07:50",
    authorLabel: "publicado por vos",
    audience: "Para: toda la sala",
    text: "El viernes salimos al parque por la mañana. Recuerden mandar gorra y una botellita de agua.",
    likes: 8,
    comments: 0,
  },
];
