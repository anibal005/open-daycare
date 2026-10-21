// Parsing helpers for the "FECHA DE NACIMIENTO" field of the add-child modal.
// The control is a plain text input (the mockup shows the `dd/mm/aaaa`
// placeholder), so the typed value has to be parsed and sanity-checked
// before it can be trusted.

export type BirthDateErrorCode =
  | "empty"
  | "format"
  | "not-a-real-date"
  | "out-of-range"
  | "in-the-future";

export type BirthDateParseResult =
  | { ok: true; iso: string }
  | { ok: false; code: BirthDateErrorCode };

const BIRTH_DATE_PATTERN = /^(\d{2})\/(\d{2})\/(\d{4})$/;
const MIN_YEAR = 1900;

export function parseBirthDate(input: string): BirthDateParseResult {
  const trimmed = input.trim();

  if (!trimmed) return { ok: false, code: "empty" };

  const match = BIRTH_DATE_PATTERN.exec(trimmed);
  if (!match) return { ok: false, code: "format" };

  const day = Number(match[1]);
  const month = Number(match[2]);
  const year = Number(match[3]);

  if (month < 1 || month > 12 || day < 1 || day > 31) {
    return { ok: false, code: "not-a-real-date" };
  }

  if (year < MIN_YEAR) {
    return { ok: false, code: "out-of-range" };
  }

  // Round-trip check: `new Date` silently rolls invalid days over
  // (31/04 becomes 01/05), so the parts have to match the original ones.
  // This is what rejects 31/02 and 29/02 on non-leap years.
  // `year` is at least 1900 here, so the 0-99 year remapping of the
  // `Date` constructor never applies.
  const date = new Date(year, month - 1, day);
  if (
    date.getFullYear() !== year ||
    date.getMonth() !== month - 1 ||
    date.getDate() !== day
  ) {
    return { ok: false, code: "not-a-real-date" };
  }

  const today = new Date();
  today.setHours(0, 0, 0, 0);
  if (date.getTime() > today.getTime()) {
    return { ok: false, code: "in-the-future" };
  }

  return { ok: true, iso: toIso(date) };
}

function toIso(date: Date): string {
  const month = String(date.getMonth() + 1).padStart(2, "0");
  const day = String(date.getDate()).padStart(2, "0");
  return `${date.getFullYear()}-${month}-${day}`;
}
