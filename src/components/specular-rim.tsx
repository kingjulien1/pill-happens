/**
 * Compatibility entry point for the former React Bits WebGL rim. Every caller
 * already paints an adjacent CSS or SVG border, so the fallback is now the
 * only renderer. Keeping this prop contract avoids changing button semantics.
 */
type SpecularRimProps = {
  radius?: number;
  thickness?: number;
  palette?: "two-tone" | "spectrum" | "triad";
  glow?: boolean;
  className?: string;
};

export function SpecularRim(props: SpecularRimProps) {
  void props;
  return null;
}
