export const INVITE_CODE_LENGTH = 5;

// Sin I, O, 0 ni 1: evita confusiones al leer o dictar el código.
export const INVITE_CODE_ALPHABET = "ABCDEFGHJKLMNPQRSTUVWXYZ23456789";

/**
 * Generates the invitation code shown in the "vincular padre" modal.
 * The alphabet has 32 characters, so `byte % 32` over a Uint8Array
 * does not introduce modulo bias.
 */
export function generateInviteCode(): string {
  const bytes = new Uint8Array(INVITE_CODE_LENGTH);
  crypto.getRandomValues(bytes);

  return Array.from(
    bytes,
    (byte) => INVITE_CODE_ALPHABET[byte % INVITE_CODE_ALPHABET.length],
  ).join("");
}
