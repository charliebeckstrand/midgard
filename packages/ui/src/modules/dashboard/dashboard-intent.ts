/**
 * Hybrid drop-intent classifier for the dashboard module: where the pointer
 * sits inside a hovered tile decides what a drop means. The middle band
 * swaps the two tiles; the top and bottom quarters open a gap above or
 * below instead. Classification reads the drag-start snapshot's geometry —
 * never the live, reflowing DOM — so only pointer movement can change the
 * answer, and every change (entering a tile, leaving it, crossing a band)
 * passes the same dwell before it commits, with a hysteresis band on the
 * zone edges. Pure over `(sample, previous, now)`, so all of it is
 * unit-testable without a drag in sight.
 */

/** The three drop meanings a hovered tile divides into. @internal */
export type DashboardDropZone = 'above' | 'swap' | 'below'

/** A committed drop meaning: the hovered tile and the zone over it. @internal */
export type DropIntent = {
	overId: string
	zone: DashboardDropZone
}

/**
 * The classifier's carried state: the committed intent driving the preview
 * (`null` over open grid), and the pending sample a change must hold
 * through the dwell before it commits.
 *
 * @internal
 */
export type IntentTracker = {
	/** The committed intent — what a drop right now would mean. */
	committed: DropIntent | null
	/** A change observed but not yet committed; `intent: null` stages an exit. */
	candidate: { intent: DropIntent | null; since: number } | null
}

/** Fraction of the tile's height taken by each insert band. @internal */
const INSERT_BAND = 0.25

/**
 * Extra penetration, as a fraction of the tile's height, required to leave
 * the committed zone — the Schmitt band that keeps a pointer resting on an
 * edge from strobing between meanings.
 *
 * @internal
 */
const HYSTERESIS = 0.1

/**
 * How long any intent change must hold before it commits. The preview
 * reflows tiles as the intent changes, so an eager classifier would answer
 * its own echo; the dwell means only a pointer that genuinely settles
 * somewhere new changes the meaning.
 *
 * @internal
 */
export const INTENT_DWELL_MS = 160

/** The zone a relative pointer height lands in, no history considered. @internal */
function rawZone(relativeY: number): DashboardDropZone {
	if (relativeY < INSERT_BAND) return 'above'

	if (relativeY > 1 - INSERT_BAND) return 'below'

	return 'swap'
}

/**
 * The zone accounting for the committed one: each boundary shifts by the
 * hysteresis band away from the zone currently held, so leaving takes more
 * penetration than staying.
 *
 * @internal
 */
function settledZone(relativeY: number, committed: DashboardDropZone): DashboardDropZone {
	if (committed === 'swap') {
		if (relativeY < INSERT_BAND - HYSTERESIS) return 'above'

		if (relativeY > 1 - INSERT_BAND + HYSTERESIS) return 'below'

		return 'swap'
	}

	if (committed === 'above') {
		if (relativeY < INSERT_BAND + HYSTERESIS) return 'above'

		return rawZone(relativeY)
	}

	if (relativeY > 1 - INSERT_BAND - HYSTERESIS) return 'below'

	return rawZone(relativeY)
}

/** Whether two samples mean the same thing — both nothing, or the same tile and zone. @internal */
function sameIntent(a: DropIntent | null, b: DropIntent | null): boolean {
	if (a === null || b === null) return a === b

	return a.overId === b.overId && a.zone === b.zone
}

/**
 * Advances the tracker by one pointer sample. The sample is the hovered
 * snapshot cell and the pointer's relative height within it, or `null` over
 * open grid; the committed intent only moves once a differing sample —
 * including the null exit sample — holds through {@link INTENT_DWELL_MS},
 * and the zone reads through the hysteresis band while the same tile stays
 * committed. Returns the previous object untouched whenever nothing
 * changes, so a render can bail on identity.
 *
 * @param previous - The carried state, or `null` before the drag's first sample.
 * @param overId - The hovered snapshot cell's id, or `null` over open grid.
 * @param relativeY - The pointer's height within that cell, `0` at its top edge.
 * @param now - The caller's clock, milliseconds; only differences matter.
 * @internal
 */
export function trackIntent(
	previous: IntentTracker | null,
	overId: string | null,
	relativeY: number,
	now: number,
): IntentTracker {
	const committed = previous?.committed ?? null

	const sample: DropIntent | null =
		overId === null
			? null
			: {
					overId,
					zone:
						committed?.overId === overId
							? settledZone(relativeY, committed.zone)
							: rawZone(relativeY),
				}

	if (sameIntent(sample, committed)) {
		if (previous !== null && previous.candidate === null) return previous

		return { committed, candidate: null }
	}

	if (previous?.candidate && sameIntent(previous.candidate.intent, sample)) {
		if (now - previous.candidate.since >= INTENT_DWELL_MS) {
			return { committed: sample, candidate: null }
		}

		return previous
	}

	return { committed, candidate: { intent: sample, since: now } }
}
