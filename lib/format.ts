/**
 * Formats seconds into MM:SS format
 *
 * @param seconds - Total seconds to format
 * @returns Object with zero-padded minutes (mm) and seconds (ss)
 *
 * @example
 * ```ts
 * formatTime(125) // { mm: "02", ss: "05" }
 * formatTime(3661) // { mm: "61", ss: "01" }
 * ```
 */
export function formatTime(seconds: number): { mm: string; ss: string } {
  const mm = Math.floor(seconds / 60)
    .toString()
    .padStart(2, "0");
  const ss = (seconds % 60).toString().padStart(2, "0");
  return { mm, ss };
}
