/**
 * Code points of the digit zero for each Indic / Perso-Arabic digit set.
 * Each set is 10 contiguous code points (zero..nine).
 */
const DIGIT_ZEROS = [
  0x0660, // Arabic-Indic
  0x06f0, // Extended Arabic-Indic (Urdu, Sindhi, Kashmiri)
  0x0966, // Devanagari
  0x09e6, // Bengali / Assamese
  0x0a66, // Gurmukhi
  0x0ae6, // Gujarati
  0x0b66, // Odia
  0x0be6, // Tamil
  0x0c66, // Telugu
  0x0ce6, // Kannada
  0x0d66, // Malayalam
  0x1c50, // Ol Chiki
  0xabf0, // Meetei Mayek
] as const;

const ASCII_ZERO = 0x30;

function toAsciiDigit(codePoint: number): string | null {
  for (const zero of DIGIT_ZEROS) {
    if (codePoint >= zero && codePoint <= zero + 9) {
      return String.fromCharCode(ASCII_ZERO + (codePoint - zero));
    }
  }
  return null;
}

/** Replaces every Indic / Perso-Arabic digit in `input` with its ASCII equivalent. */
export function normalizeDigits(input: string): string {
  let out = '';
  for (const char of input) {
    out += toAsciiDigit(char.codePointAt(0) ?? 0) ?? char;
  }
  return out;
}
