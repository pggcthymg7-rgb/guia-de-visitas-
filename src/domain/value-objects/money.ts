/**
 * Value Object: Money (BRL Currency in Integer Cents)
 * Guarantees zero floating point errors and provides deterministic masking.
 */

/**
 * Validates that cents is a non-negative integer.
 */
export function isValidPriceCents(cents: unknown): cents is number {
  return typeof cents === 'number' && Number.isSafeInteger(cents) && cents >= 0;
}

/**
 * Formats integer cents into Brazilian Real (BRL) string:
 * 250000000 -> "R$ 2.500.000,00"
 * 0 -> "R$ 0,00"
 */
export function centsToBrl(cents: number | null | undefined): string {
  if (cents === null || cents === undefined || isNaN(cents) || cents < 0) {
    return 'R$ 0,00';
  }
  const safeCents = Math.round(cents);
  const integerPart = Math.floor(safeCents / 100);
  const decimalPart = safeCents % 100;

  // Insert thousands dots deterministically
  const formattedInt = integerPart.toString().replace(/\B(?=(\d{3})+(?!\d))/g, '.');
  const formattedDec = decimalPart.toString().padStart(2, '0');

  return `R$ ${formattedInt},${formattedDec}`;
}

/**
 * Parses any raw BRL or numeric string into integer cents:
 * "R$ 2.500.000,00" -> 250000000
 * "2500000" -> 250000000
 * "0,50" -> 50
 */
export function brlToCents(brlInput: string | number | null | undefined): number {
  if (brlInput === null || brlInput === undefined) return 0;
  if (typeof brlInput === 'number') {
    return Math.max(0, Math.round(brlInput));
  }
  const trimmed = brlInput.trim();
  if (!trimmed) return 0;

  // Extract all digits
  const digits = trimmed.replace(/\D/g, '');
  if (!digits) return 0;

  const parsed = parseInt(digits, 10);
  return isNaN(parsed) ? 0 : parsed;
}

/**
 * Real-time input mask for BRL currency fields on keystroke:
 * "2" -> "R$ 0,02"
 * "250" -> "R$ 2,50"
 * "250000000" -> "R$ 2.500.000,00"
 */
export function maskBrlInput(rawValue: string): string {
  const digits = rawValue.replace(/\D/g, '');
  if (!digits) return '';
  const cents = parseInt(digits, 10);
  return centsToBrl(cents);
}

/**
 * Formats cents into compact executive format for badges / headers:
 * 250000000 -> "R$ 2,5M"
 * 85000000 -> "R$ 850 mil"
 */
export function formatBrlCompact(cents: number): string {
  if (!cents || cents < 0) return 'R$ 0';
  const reals = cents / 100;
  if (reals >= 1_000_000) {
    const millions = (reals / 1_000_000).toFixed(1).replace('.', ',');
    return `R$ ${millions.replace(',0', '')}M`;
  }
  if (reals >= 1_000) {
    const thousands = Math.round(reals / 1_000);
    return `R$ ${thousands} mil`;
  }
  return centsToBrl(cents);
}
