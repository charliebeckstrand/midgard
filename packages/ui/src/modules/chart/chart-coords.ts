/**
 * Coordinate formatting for the charts' SVG path strings. Kept beside the
 * geometry cores so every `d`-builder rounds the same way, independent of
 * React and styling.
 */

/**
 * Formats a coordinate for a path `d`, rounded to sub-pixel precision. A raw
 * projected coordinate carries full float precision — up to seventeen digits
 * — and at ten thousand points those digits are the path string: hundreds of
 * kilobytes the geometry builds, React commits, and the browser reparses and
 * rasterizes. Two decimals sit well under one device pixel at any real chart
 * size, so the rounding never shows, while the string it produces is a
 * fraction of the size. An integer coordinate round-trips to its own digits
 * (`12` → `'12'`), so a whole-number fixture reads unchanged.
 *
 * @internal
 */
export function coord(value: number): string {
	return String(Math.round(value * 100) / 100)
}
