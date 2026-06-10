/** The wire format a ColorPanel / ColorPicker speaks through its value props. */
export type ColorFormat = 'hex' | 'hsva'

/** Red / green / blue, each `0-255`. */
export type Rgb = { r: number; g: number; b: number }

/** {@link Rgb} plus an alpha channel `0-1`. */
export type Rgba = Rgb & { a: number }

/** Hue `0-360`, saturation / value `0-100`. */
export type Hsv = { h: number; s: number; v: number }

/** {@link Hsv} plus an alpha channel `0-1`. The picker's internal source of truth. */
export type Hsva = Hsv & { a: number }

/** Hex wire contract: a `#rrggbb(aa)` string in and out. The default `format`. */
export type ColorHexValueProps = {
	format?: 'hex'
	value?: string
	defaultValue?: string
	onValueChange?: (value: string) => void
}

/** HSVA wire contract: the structured object in and out. */
export type ColorHsvaValueProps = {
	format: 'hsva'
	value?: Hsva
	defaultValue?: Hsva
	onValueChange?: (value: Hsva) => void
}

/** Format-discriminated value props shared by `<ColorPanel>` and `<ColorPicker>`. */
export type ColorValueProps = ColorHexValueProps | ColorHsvaValueProps
