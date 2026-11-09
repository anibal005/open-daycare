// Internal identifiers in English; Spanish labels are display-only.
export type AvatarTone = "blue" | "pink" | "green" | "yellow" | "purple";
export type ParentStatus = "active" | "pending";

export interface Parent {
  name: string; // "Lucía Fernández"
  avatarLetter: string; // "L"
  tone: AvatarTone;
  roleLabel: string; // "Mamá" | "Papá" — display only
  status: ParentStatus;
  invitedBy?: string | null;
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

const AVATAR_TONE_ORDER: AvatarTone[] = [
  "blue",
  "pink",
  "green",
  "yellow",
  "purple",
];

// Purely cosmetic: the tone repeats across names and never identifies a child.
export function getAvatarToneForName(name: string): AvatarTone {
  const index = (name.charCodeAt(0) || 0) % AVATAR_TONE_ORDER.length;
  return AVATAR_TONE_ORDER[index];
}
