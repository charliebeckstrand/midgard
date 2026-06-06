/** The wire format a ColorPanel / ColorPicker speaks through its value props. */
export type ColorFormat = 'hex' | 'hsva'

/** Red / green / blue, each `0–255`. */
export type Rgb = { r: number; g: number; b: number }

/** {@link Rgb} plus an alpha channel `0–1`. */
export type Rgba = Rgb & { a: number }

/** Hue `0–360`, saturation / value `0–100`. */
export type Hsv = { h: number; s: number; v: number }

/** {@link Hsv} plus an alpha channel `0–1`. The picker's internal source of truth. */
export type Hsva = Hsv & { a: number }
