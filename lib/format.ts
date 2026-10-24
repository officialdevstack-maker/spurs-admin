/**
 * One home for the formatters used across the console.
 * Client-safe: no imports, no server-only dependencies.
 */

const group = (s: string) => s.replace(/\B(?=(\d{3})+(?!\d))/g, ",");

export function formatNaira(
  minor: number | string | bigint | null | undefined,
  opts: { kobo?: boolean } = {},
): string {
  const raw =
    typeof minor === "bigint"
      ? minor
      : BigInt(typeof minor === "number" ? Math.round(minor || 0) : minor || "0");

  const negative = raw < BigInt(0);
  const abs = negative ? -raw : raw;
  const sign = negative ? "-" : "";

  if (opts.kobo) {
    const digits = abs.toString().padStart(3, "0");
    return `${sign}₦${group(digits.slice(0, -2))}.${digits.slice(-2)}`;
  }

  const whole = (abs + BigInt(50)) / BigInt(100);
  return `${sign}₦${group(whole.toString())}`;
}

export const formatWhen = (s: string | Date | null | undefined) =>
  s
    ? new Date(s).toLocaleString("en-NG", {
        day: "numeric",
        month: "short",
        hour: "2-digit",
        minute: "2-digit",
      })
    : "—";

export const formatDate = (s: string | Date | null | undefined) =>
  s
    ? new Date(s).toLocaleDateString("en-NG", {
        day: "numeric",
        month: "short",
        year: "numeric",
      })
    : "—";

export function timeAgo(iso: string | Date | null | undefined): string {
  if (!iso) return "never";
  const secs = Math.floor((Date.now() - new Date(iso).getTime()) / 1000);
  if (secs < 60) return `${Math.max(0, secs)}s ago`;
  if (secs < 3600) return `${Math.floor(secs / 60)}m ago`;
  if (secs < 86400) return `${Math.floor(secs / 3600)}h ago`;
  return `${Math.floor(secs / 86400)}d ago`;
}
