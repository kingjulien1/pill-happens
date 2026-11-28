import {
  APP_FOUNDATION,
  colorContrast,
  mixAppColors,
  type AppThemeHex,
} from "./app-theme";
import { getMedicationIconPigment } from "./medication-preview-colors";

/** Match the rendered icon pigment with an opaque, readable tinted backplate. */
export function getMedicationBadgePaint(value: string) {
  const pigment = (
    /^#[0-9a-f]{6}$/i.test(value) ? value : getMedicationIconPigment()
  ) as AppThemeHex;
  const neutral =
    colorContrast(pigment, APP_FOUNDATION.white) >=
    colorContrast(pigment, APP_FOUNDATION.black)
      ? APP_FOUNDATION.white
      : APP_FOUNDATION.black;
  const tinted = mixAppColors(neutral, pigment, 0.86);
  return {
    surface: colorContrast(pigment, tinted) >= 3 ? tinted : neutral,
    copy: pigment,
    rim: pigment,
  };
}
