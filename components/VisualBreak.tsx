/**
 * Visual Break between About and Pricing
 * Measured from design composite PNG:
 * - Artboard width 1024 → black band height 247px
 * - Scaled to 1440 frame (×1.40625) → 347px
 */
export default function VisualBreak() {
  return (
    <section
      aria-hidden
      className="w-full bg-hu-black"
      style={{ height: "347px" }}
    />
  );
}
