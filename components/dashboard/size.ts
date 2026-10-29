/**
 * Velikost okna na ploše → jakou podobu má obsah (jako widgety v iPhonu).
 *   S = malé: souhrn s velkým číslem
 *   M = střední: zkrácený seznam
 *   L = velké: plný detail
 * `wide` = dost široké na rozložení vedle sebe (řádky na jeden řádek, 2 sloupce).
 * Počítá se z opravdových pixelů obsahu, takže se mění živě i během tažení.
 */
export interface WidgetSize {
  width: number;
  height: number;
  size: "S" | "M" | "L";
  wide: boolean;
}

export function classify(width: number, height: number): WidgetSize {
  const size = height < 230 || width < 260 ? "S" : height < 440 ? "M" : "L";
  return { width, height, size, wide: width >= 600 };
}

/** Výchozí (mimo plochu, např. stránka Worklist): plný detail. */
export const FULL: WidgetSize = { width: 9999, height: 9999, size: "L", wide: false };
