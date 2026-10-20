// Internal identifiers in English; Spanish labels are display-only.
export type AvatarTone = "blue" | "pink" | "green" | "yellow" | "purple";
export type ParentStatus = "active" | "pending";

export interface Parent {
  name: string; // "Lucía Fernández"
  avatarLetter: string; // "L"
  tone: AvatarTone;
  roleLabel: string; // "Mamá" | "Papá" — display only
  status: ParentStatus;
}

export interface Child {
  id: string; // slug in English: "mateo-fernandez"
  name: string; // "Mateo Fernández"
  avatarLetter: string; // "M"
  tone: AvatarTone;
  ageLabel: string; // "3 años"
  parentsCount: number; // 0..2 — for the list meta line
  allergyTag?: string; // "MANÍ" | "LACTOSA" — card badge
  needsParentLink?: boolean; // shows the "VINCULAR" badge
  profile: {
    birthDate: string; // "12 mar 2022"
    room: string; // "Soles"
    admission: string; // "feb 2025"
    allergyNote?: string; // "Alergias y notas" banner
    parents: Parent[];
  };
}

export const AVATAR_TONES: Record<AvatarTone, { bg: string; text: string }> = {
  blue: { bg: "bg-[#A9D9E8]", text: "text-[#1F7A93]" },
  pink: { bg: "bg-[#F4B8CC]", text: "text-[#C44A7A]" },
  green: { bg: "bg-[#B9DEC4]", text: "text-[#3E8B62]" },
  yellow: { bg: "bg-[#F4DC8E]", text: "text-[#9A7B1E]" },
  purple: { bg: "bg-[#C9B6E8]", text: "text-[#7B5FC0]" },
};

export const PARENT_STATUS_LABELS: Record<
  ParentStatus,
  { label: string; bg: string; text: string }
> = {
  active: { label: "ACTIVA", bg: "bg-[#CFEBD8]", text: "text-[#3E9B6C]" },
  pending: { label: "PENDIENTE", bg: "bg-[#F7E7A6]", text: "text-[#9A7B1E]" },
};

export const PARENT_STATUS_META: Record<ParentStatus, string> = {
  active: "activa",
  pending: "invitación enviada",
};

export const children: Child[] = [
  {
    id: "mateo-fernandez",
    name: "Mateo Fernández",
    avatarLetter: "M",
    tone: "blue",
    ageLabel: "3 años",
    parentsCount: 2,
    allergyTag: "MANÍ",
    profile: {
      birthDate: "12 mar 2022",
      room: "Soles",
      admission: "feb 2025",
      allergyNote:
        "Alergia al maní. Evitar frutos secos. Lleva inhalador en la mochila.",
      parents: [
        {
          name: "Lucía Fernández",
          avatarLetter: "L",
          tone: "purple",
          roleLabel: "Mamá",
          status: "active",
        },
        {
          name: "Diego Fernández",
          avatarLetter: "D",
          tone: "blue",
          roleLabel: "Papá",
          status: "pending",
        },
      ],
    },
  },
  {
    id: "sofia-mendez",
    name: "Sofía Méndez",
    avatarLetter: "S",
    tone: "pink",
    ageLabel: "2 años",
    parentsCount: 1,
    profile: {
      birthDate: "22 jul 2023",
      room: "Soles",
      admission: "mar 2025",
      parents: [
        {
          name: "Carolina Méndez",
          avatarLetter: "C",
          tone: "pink",
          roleLabel: "Mamá",
          status: "active",
        },
      ],
    },
  },
  {
    id: "benjamin-ruiz",
    name: "Benjamín Ruiz",
    avatarLetter: "B",
    tone: "green",
    ageLabel: "3 años",
    parentsCount: 2,
    profile: {
      birthDate: "28 oct 2021",
      room: "Soles",
      admission: "abr 2024",
      parents: [
        {
          name: "Paula Ruiz",
          avatarLetter: "P",
          tone: "green",
          roleLabel: "Mamá",
          status: "active",
        },
        {
          name: "Jorge Ruiz",
          avatarLetter: "J",
          tone: "blue",
          roleLabel: "Papá",
          status: "active",
        },
      ],
    },
  },
  {
    id: "valentina-soto",
    name: "Valentina Soto",
    avatarLetter: "V",
    tone: "yellow",
    ageLabel: "2 años",
    parentsCount: 0,
    needsParentLink: true,
    profile: {
      birthDate: "14 nov 2023",
      room: "Soles",
      admission: "sep 2025",
      parents: [],
    },
  },
  {
    id: "tomas-diaz",
    name: "Tomás Díaz",
    avatarLetter: "T",
    tone: "purple",
    ageLabel: "3 años",
    parentsCount: 1,
    allergyTag: "LACTOSA",
    profile: {
      birthDate: "02 may 2022",
      room: "Soles",
      admission: "jun 2024",
      allergyNote:
        "Intolerancia a la lactosa. Revisar las etiquetas de los snacks y la merienda.",
      parents: [
        {
          name: "Marcela Díaz",
          avatarLetter: "M",
          tone: "purple",
          roleLabel: "Mamá",
          status: "active",
        },
      ],
    },
  },
  {
    id: "emma-castro",
    name: "Emma Castro",
    avatarLetter: "E",
    tone: "pink",
    ageLabel: "2 años",
    parentsCount: 1,
    profile: {
      birthDate: "19 sep 2023",
      room: "Soles",
      admission: "ago 2025",
      parents: [
        {
          name: "Ana Castro",
          avatarLetter: "A",
          tone: "yellow",
          roleLabel: "Mamá",
          status: "active",
        },
      ],
    },
  },
  {
    id: "lucas-romero",
    name: "Lucas Romero",
    avatarLetter: "L",
    tone: "blue",
    ageLabel: "3 años",
    parentsCount: 1,
    profile: {
      birthDate: "07 feb 2022",
      room: "Soles",
      admission: "ene 2025",
      parents: [
        {
          name: "Silvina Romero",
          avatarLetter: "S",
          tone: "green",
          roleLabel: "Mamá",
          status: "active",
        },
      ],
    },
  },
  {
    id: "olivia-vega",
    name: "Olivia Vega",
    avatarLetter: "O",
    tone: "green",
    ageLabel: "2 años",
    parentsCount: 1,
    profile: {
      birthDate: "30 nov 2023",
      room: "Soles",
      admission: "jul 2025",
      parents: [
        {
          name: "Ramiro Vega",
          avatarLetter: "R",
          tone: "blue",
          roleLabel: "Papá",
          status: "active",
        },
      ],
    },
  },
];
