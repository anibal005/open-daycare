// Internal identifiers in English; Spanish labels are display-only.
export interface Room {
  id: string; // "soles"
  name: string; // "Soles"
}

export const ROOMS: Room[] = [
  { id: "soles", name: "Soles" },
  { id: "lunas", name: "Lunas" },
  { id: "estrellas", name: "Estrellas" },
  { id: "nubes", name: "Nubes" },
];
