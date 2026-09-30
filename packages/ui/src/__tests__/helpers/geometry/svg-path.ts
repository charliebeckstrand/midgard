/**
 * Counts the subpaths of an SVG path `d`. One `M` command opens each subpath.
 *
 * @remarks
 * A missing `d` counts as zero. The count reads the string only, so it runs
 * with no window.
 */
export function subpathCount(d: string | null | undefined): number {
	return (d ?? '').split('M').length - 1
}
