/**
 * Pure fit math for the stacked legend's row cap: how many entries show before
 * the rest collapse into a `+N` overflow chip. Kept React-free so the packing
 * logic is unit-testable without a layout engine — the measurement that feeds it
 * (each entry's wrapped row and right edge) is the browser's job; deciding the
 * cut from those numbers is this file's.
 *
 * A stacked band is capped to a tier-resolved number of rows so it can never take
 * unbounded height from the aspect box and crush the plot. Entries past the cap
 * do not clip silently: they fold into a chip that opens the same switchboard, so
 * the count is exact and every switch stays reachable.
 */

/** One measured legend entry: its wrapped row (0-based) and its right edge in the container's content box. @internal */
export type LegendEntryRect = {
	/** The row the entry wrapped onto, `0` the first — from its top offset over the row height. */
	row: number
	/** The entry's right edge, in px from the container's content-box left. */
	right: number
}

/**
 * The reserve a `+N` chip needs beside the last visible entry: a gap plus the
 * chip's own box. A fixed estimate, not a measurement — the chip reads `+N` (a
 * digit or two after a plus), whose width barely varies, unlike the proportional
 * series labels the fit measures exactly. Generous enough that the chip never
 * itself overflows the row it is reserved on.
 *
 * @internal
 */
export const OVERFLOW_CHIP_RESERVE = 48

/**
 * How many of the measured `rects` show before the `+N` chip, given a `maxRows`
 * cap. Everything fits — no chip — when no entry wrapped past the cap; the full
 * count returns. Otherwise the cut is the entries within the cap, trimmed back
 * while the last one sits on the final capped row with no room for the chip
 * beside it, so the chip always lands on a row it fits rather than spilling to a
 * new one. Entries wrap in order, so the first `n` rects are exactly the first
 * `n` entries — the return is a prefix length.
 *
 * @param rects Each entry's wrapped row and right edge, in DOM (wrap) order.
 * @param maxRows The tier's row cap; `0` shows nothing (the legend is gone).
 * @param containerWidth The wrap's content-box width, the right edge the chip
 * must fit inside.
 * @param chipReserve The room the chip needs beside the last entry ({@link
 * OVERFLOW_CHIP_RESERVE}).
 * @internal
 */
export function visibleLegendCount(
	rects: LegendEntryRect[],
	maxRows: number,
	containerWidth: number,
	chipReserve: number,
): number {
	if (maxRows <= 0) return 0

	// Entries wrap top-to-bottom in order, so those within the cap are the leading
	// run; their count is where the overflow begins.
	const withinCap = rects.filter((rect) => rect.row < maxRows).length

	if (withinCap === rects.length) return rects.length

	// Overflow exists, so a chip must fit. Trim the last visible entry while it
	// sits on the final capped row with no room for the chip beside it — an earlier
	// row leaves the final row free for the chip, so it needs no trim.
	let visible = withinCap

	while (visible > 0) {
		const last = rects[visible - 1]

		if (!last || last.row < maxRows - 1) break

		if (last.right + chipReserve <= containerWidth) break

		visible--
	}

	return visible
}
