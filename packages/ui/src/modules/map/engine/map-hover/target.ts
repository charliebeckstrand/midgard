/**
 * What the pointer and the keyboard cursor are on, and the comparisons every
 * reader of that answer makes. The target is one shape for a heterogeneous
 * field — a region by index, an overlay mark by id and stop — so the emphasis,
 * the readout, and the cursor never each carry their own idea of what is under
 * the pointer.
 */

/**
 * What the pointer is on: a region by feature index, or an overlay (route /
 * point / marker) by its registered legend id — the map's hover targets are
 * heterogeneous where a chart's are one category axis.
 *
 * @internal
 */
export type MapHoverTarget =
	| { kind: 'region'; index: number }
	| {
			kind: 'entry'
			id: string
			/**
			 * Which of the mark's stops, for a mark that draws more than one — a
			 * {@link MapPoints} dot. A singular mark carries `0`, so an entry target
			 * always has a stop and no reader tests for its absence.
			 */
			stop: number
	  }

/** Whether two hover targets name the same mark, so a redundant write can bail. @internal */
export function sameTarget(a: MapHoverTarget | null, b: MapHoverTarget | null): boolean {
	if (a === b) return true

	if (a === null || b === null || a.kind !== b.kind) return false

	return sameMark(a, b) && (a.kind === 'region' || a.stop === (b as { stop: number }).stop)
}

/**
 * Whether two targets name the same *mark*, ignoring which of its stops. The
 * whole of a plural mark reads as one thing to the emphasis — pointing one dot
 * of a {@link MapPoints} lights the group, not that dot alone — which is what
 * lets the group draw under a single wrapper and a single dim class where two
 * hundred dots would otherwise need two hundred.
 *
 * {@link sameTarget} is this plus the stop, so a third target kind is added
 * here once rather than in two comparisons that must agree.
 *
 * @internal
 */
export function sameMark(a: MapHoverTarget | null, b: MapHoverTarget | null): boolean {
	if (a === b) return true

	if (a === null || b === null || a.kind !== b.kind) return false

	return a.kind === 'region'
		? a.index === (b as { index: number }).index
		: a.id === (b as { id: string }).id
}

/**
 * Whether a mark reads dimmed under the shared emphasis: the pointed mark
 * recedes everything but itself, else the legend's focused id dims marks
 * outside its group (`groupId` — an overlay's own entry id, a region's
 * category id), else nothing dims. The pointed mark winning over a still-held
 * legend focus mirrors the chart's mark-emphasis resolution.
 *
 * @internal
 */
export function mapMarkDimmed(
	pointed: MapHoverTarget | null,
	self: MapHoverTarget,
	emphasis: string | null,
	groupId: string | null,
): boolean {
	// Compared by mark, not by stop: a plural mark draws under one wrapper, so
	// pointing one of its dots must light the whole group rather than dim the rest
	// of itself.
	if (pointed !== null) return !sameMark(pointed, self)

	return emphasis !== null && emphasis !== groupId
}
