import { APP_FOUNDATION, mixAppColors, type AppThemeHex } from "./app-theme";
import { getMedicationIconPigment } from "./medication-preview-colors";

function luminance(hex: string) {
  const channels = [1, 3, 5].map((offset) => {
    const value = parseInt(hex.slice(offset, offset + 2), 16) / 255;
    return value <= 0.04045 ? value / 12.92 : ((value + 0.055) / 1.055) ** 2.4;
  });
  return channels[0] * 0.2126 + channels[1] * 0.7152 + channels[2] * 0.0722;
}

function contrast(first: string, second: string) {
  const values = [luminance(first), luminance(second)].sort((a, b) => a - b);
  return (values[1] + 0.05) / (values[0] + 0.05);
}

/** Match the rendered icon pigment with an opaque, readable tinted backplate. */
export function getMedicationBadgePaint(value: string) {
  const pigment = (
    /^#[0-9a-f]{6}$/i.test(value) ? value : getMedicationIconPigment()
  ) as AppThemeHex;
  const neutral =
    contrast(pigment, APP_FOUNDATION.white) >=
    contrast(pigment, APP_FOUNDATION.black)
      ? APP_FOUNDATION.white
      : APP_FOUNDATION.black;
  const tinted = mixAppColors(neutral, pigment, 0.86);
  return {
    surface: contrast(pigment, tinted) >= 3 ? tinted : neutral,
    copy: pigment,
    rim: pigment,
  };
}
