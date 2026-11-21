/**
 * Compatibility export for the former passive shader. JournalBackground now
 * paints the same violet field and overlays through its shared CSS still.
 * Decorative backgrounds must not reserve a GPU context or an animation clock.
 */
export function Iridescence() {
  return null;
}
