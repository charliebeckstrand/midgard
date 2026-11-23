/**
 * The bounds of the width of the thumbnail rail, in CSS pixels. The reader drags or steps the
 * width between `min` and `max`, and the rail opens at `default`, which is halfway between them.
 *
 * @internal
 */
export const PDF_VIEWER_RAIL_WIDTH = { min: 160, default: 240, max: 320 } as const

/**
 * The custom property that holds the width of the rail. The resize handle writes it on the
 * rail, and the kata reads it for the width and for the margin of the collapsed rail.
 *
 * @internal
 */
export const PDF_VIEWER_RAIL_PROPERTY = '--pdf-viewer-rail'

/**
 * The inline padding of the thumbnail list, on the two sides together (`px-4` in the kata).
 *
 * @internal
 */
const RAIL_PADDING = 32

/**
 * The widest thumbnail in CSS pixels: the widest rail, less its padding. A thumbnail raster is
 * this width times the device pixel ratio, up to 2x. So a thumbnail is sharp at each width
 * that the rail can have, on a dense screen too.
 *
 * @internal
 */
export const PDF_VIEWER_THUMBNAIL_WIDTH = PDF_VIEWER_RAIL_WIDTH.max - RAIL_PADDING
