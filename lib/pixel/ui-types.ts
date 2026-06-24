// Shim portado del repo Pixel Agents (components/ui/types.ts) — solo ColorValue.
export interface ColorValue {
  h: number; // Hue
  s: number; // Saturation
  b: number; // Brightness
  c: number; // Contrast
  colorize?: boolean;
}
