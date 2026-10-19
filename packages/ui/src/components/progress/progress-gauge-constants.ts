/**
 * Side length of the gauge's square SVG `viewBox`, in user units; radius and
 * center derive from it.
 * @internal
 */
export const GAUGE_VIEW_BOX = 36

/**
 * The range of the ring thickness, in user units. The `@minimum` and
 * `@maximum` tags of `strokeWidth` give the same numbers to the docs.
 * @internal
 */
export const GAUGE_STROKE_WIDTH = { min: 1, max: 6 } as const
