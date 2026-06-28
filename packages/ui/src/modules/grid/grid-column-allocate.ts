/**
 * A column's width bounds for {@link allocateColumnWidths}: its hard floor
 * (`min`), its preferred content width (`content`, the width that shows the
 * column's content without truncating), and its ceiling (`max`,
 * `Number.MAX_SAFE_INTEGER` when unbounded). A `width`-pinned column arrives with
 * `min === content === max`, so the allocator holds it exactly.
 *
 * @internal
 */
export type ColumnSizeProfile = {
	id: string
	min: number
	content: number
	max: number
}

/** Clamps `value` to `[lo, hi]`; `hi` wins when the bounds cross. @internal */
function clamp(value: number, lo: number, hi: number): number {
	return Math.min(Math.max(value, lo), hi)
}

/**
 * Rounds the floating widths to integers that sum to exactly `target`, by the
 * largest-remainder method: floor each, then hand the leftover pixels to the
 * columns with the largest fractional parts. Summing to an exact target is what
 * keeps the fixed-layout table off a phantom horizontal scrollbar — rounding each
 * column independently can leave a pixel or two of slack.
 *
 * @internal
 */
function roundToTarget(
	widths: { id: string; width: number }[],
	target: number,
): Record<string, number> {
	const floored = widths.map((w) => ({
		id: w.id,
		width: Math.floor(w.width),
		frac: w.width - Math.floor(w.width),
	}))

	let leftover = target - floored.reduce((sum, w) => sum + w.width, 0)

	// Give the leftover (or take back, when negative) one pixel at a time, largest
	// fractional part first, so the rounding lands on the columns that were closest
	// to rounding up anyway.
	const order = [...floored].sort((a, b) => b.frac - a.frac)

	for (let i = 0; leftover > 0 && i < order.length; i++, leftover--) {
		const entry = order[i]

		if (entry) entry.width += 1
	}

	for (let i = 0; leftover < 0 && i < order.length; i++, leftover++) {
		const entry = order[order.length - 1 - i]

		if (entry) entry.width -= 1
	}

	const result: Record<string, number> = {}

	for (const entry of floored) result[entry.id] = entry.width

	return result
}

/**
 * Raises columns from their `desired` width toward a common level `L`, capped at
 * each column's `max`, so the surplus `available - Σdesired` is absorbed by the
 * narrowest columns first — they rise to meet the wider ones (ending equal among
 * themselves) while a column already wider than `L` keeps its content width. The
 * level solves `Σ min(max, max(desired, L)) = available`, found by bisection;
 * when every column caps out below `available` the table holds at `Σmax` and the
 * surplus is left as trailing space rather than stretching past a ceiling.
 *
 * @internal
 */
function levelUp(
	cols: { id: string; desired: number; max: number }[],
	available: number,
): Record<string, number> {
	const totalMax = cols.reduce((sum, c) => sum + c.max, 0)

	// Every column would cap out before filling the width: hold them at their max
	// and leave the remainder as trailing space.
	if (totalMax <= available) {
		return roundToTarget(
			cols.map((c) => ({ id: c.id, width: c.max })),
			Math.round(totalMax),
		)
	}

	const widthAt = (level: number) =>
		cols.reduce((sum, c) => sum + Math.min(c.max, Math.max(c.desired, level)), 0)

	let lo = 0

	// No useful level exceeds the available width (a lone column fills it at most),
	// so cap the search there — an unbounded `max` would otherwise blow the range up
	// to `MAX_SAFE_INTEGER`, leaving 50 halvings short of sub-pixel precision.
	let hi = available

	// Bisect the level so the summed widths meet `available`. ~50 halvings drives
	// the residual well below a pixel, which the integer rounding then absorbs.
	for (let i = 0; i < 50; i++) {
		const mid = (lo + hi) / 2

		if (widthAt(mid) < available) lo = mid
		else hi = mid
	}

	return roundToTarget(
		cols.map((c) => ({ id: c.id, width: Math.min(c.max, Math.max(c.desired, lo)) })),
		available,
	)
}

/**
 * Distributes `available` pixels across the columns from their measured
 * profiles, content-first in two regimes. Each column's `desired` width is its
 * `content` clamped to `[min, max]`. When the desired widths meet or exceed the
 * space (or there is none), every column holds at its desired width and the table
 * overflows horizontally — content shows, the rest scrolls — rather than
 * shrinking below it and truncating. When there is room to spare, the surplus
 * lifts the narrowest columns toward an equal width (see {@link levelUp}), so a
 * column whose data would truncate gains the room while columns that don't need
 * it settle at the shared level. Returns integer widths keyed by column id,
 * summing to exactly the space consumed; an empty profile list yields `{}`.
 *
 * Pure: non-data columns (selection / actions), `width`-pinned columns, and
 * manually drag-resized columns are resolved by the caller and excluded from
 * `profiles`, with their widths already subtracted from `available`.
 *
 * @internal
 */
export function allocateColumnWidths(
	profiles: ColumnSizeProfile[],
	available: number,
): Record<string, number> {
	if (profiles.length === 0) return {}

	const cols = profiles.map((p) => ({
		id: p.id,
		desired: clamp(p.content, p.min, p.max),
		max: p.max,
	}))

	const totalDesired = cols.reduce((sum, c) => sum + c.desired, 0)

	// Deficit (or no space): hold at the desired widths and let the table overflow.
	if (available <= 0 || totalDesired >= available) {
		return roundToTarget(
			cols.map((c) => ({ id: c.id, width: c.desired })),
			Math.round(totalDesired),
		)
	}

	// Surplus: lift the narrowest columns toward an equal level.
	return levelUp(cols, available)
}
