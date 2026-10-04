/**
 * The types of the part of `subset-font` that `fonts.ts` uses. The package has
 * no types of its own, and `@types/subset-font` does not have `keepFeatures`.
 */
declare module 'subset-font' {
	/** The options of one subset. An option that is not set keeps the default of HarfBuzz. */
	type SubsetFontOptions = {
		/** The format of the subset. The default is the format of the font. */
		targetFormat?: 'sfnt' | 'woff' | 'woff2'

		/** The layout features that the subset keeps. The default keeps each feature. */
		keepFeatures?: string[]

		/**
		 * A value or a range for each variation axis. A value pins the axis, and a
		 * range limits it. An axis that is not here keeps its full range.
		 */
		variationAxes?: Record<string, number | { min: number; max: number; default?: number }>
	}

	/** Returns a subset of `font` that has the glyphs of the characters in `text`. */
	function subsetFont(font: Buffer, text: string, options?: SubsetFontOptions): Promise<Buffer>

	export = subsetFont
}
