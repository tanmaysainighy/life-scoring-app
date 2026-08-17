/**
 * What's left of the primitives.
 *
 * The card, stat box, progress bar and glyph tile all went: structure now comes
 * from the type scale and hairline rules in globals.css, so a component whose
 * only job was to draw a border had nothing to do.
 */

export function Avatar({ name, hue, size = 32 }: { name: string; hue: number; size?: number }) {
  const initials = name.trim().split(/\s+/).slice(0, 2).map((w) => w[0]?.toUpperCase() ?? "").join("");
  return (
    <span
      aria-hidden
      className="inline-flex shrink-0 items-center justify-center rounded-full"
      style={{
        width: size,
        height: size,
        fontSize: size * 0.36,
        background: `hsl(${hue} 30% 50% / .16)`,
        color: `hsl(${hue} 45% 38%)`,
      }}
    >
      {initials || "?"}
    </span>
  );
}
