import { describe, expect, it } from 'vitest'
import {
	INTENT_DWELL_MS,
	type IntentTracker,
	trackIntent,
} from '../../modules/dashboard/dashboard-intent'

/** Runs one sample twice — staged, then held past the dwell — so it commits. */
function settle(
	previous: IntentTracker | null,
	overId: string | null,
	relativeY: number,
	at: number,
): IntentTracker {
	const staged = trackIntent(previous, overId, relativeY, at)

	return trackIntent(staged, overId, relativeY, at + INTENT_DWELL_MS)
}

describe('trackIntent', () => {
	it('starts empty over open grid', () => {
		const tracker = trackIntent(null, null, 0, 0)

		expect(tracker.committed).toBeNull()

		expect(tracker.candidate).toBeNull()
	})

	it('stages an entry and commits it only after the dwell', () => {
		const staged = trackIntent(null, 'a', 0.5, 0)

		expect(staged.committed).toBeNull()

		expect(staged.candidate?.intent).toEqual({ overId: 'a', zone: 'swap' })

		const early = trackIntent(staged, 'a', 0.5, INTENT_DWELL_MS - 1)

		expect(early.committed).toBeNull()

		const committed = trackIntent(early, 'a', 0.5, INTENT_DWELL_MS)

		expect(committed.committed).toEqual({ overId: 'a', zone: 'swap' })

		expect(committed.candidate).toBeNull()
	})

	it('classifies the entry band by pointer height', () => {
		expect(settle(null, 'a', 0.1, 0).committed?.zone).toBe('above')

		expect(settle(null, 'a', 0.5, 0).committed?.zone).toBe('swap')

		expect(settle(null, 'a', 0.9, 0).committed?.zone).toBe('below')
	})

	it('holds the committed zone inside the hysteresis band', () => {
		const swap = settle(null, 'a', 0.5, 0)

		// 0.22 is past the raw 0.25 boundary but inside the widened swap band.
		const held = trackIntent(swap, 'a', 0.22, 500)

		expect(held.committed?.zone).toBe('swap')

		expect(held.candidate).toBeNull()
	})

	it('stages a zone change and commits it through the same dwell', () => {
		const swap = settle(null, 'a', 0.5, 0)

		const staged = trackIntent(swap, 'a', 0.1, 500)

		expect(staged.committed?.zone).toBe('swap')

		expect(staged.candidate?.intent).toEqual({ overId: 'a', zone: 'above' })

		const committed = trackIntent(staged, 'a', 0.1, 500 + INTENT_DWELL_MS)

		expect(committed.committed?.zone).toBe('above')
	})

	it('stages an exit to open grid and only then releases', () => {
		const swap = settle(null, 'a', 0.5, 0)

		const staged = trackIntent(swap, null, 0, 500)

		// The committed intent keeps driving the preview through the dwell.
		expect(staged.committed?.zone).toBe('swap')

		expect(staged.candidate?.intent).toBeNull()

		const released = trackIntent(staged, null, 0, 500 + INTENT_DWELL_MS)

		expect(released.committed).toBeNull()
	})

	it('drops a candidate that retreats before the dwell elapses', () => {
		const swap = settle(null, 'a', 0.5, 0)

		const staged = trackIntent(swap, 'a', 0.1, 500)

		const retreated = trackIntent(staged, 'a', 0.5, 520)

		expect(retreated.committed?.zone).toBe('swap')

		expect(retreated.candidate).toBeNull()

		// A fresh excursion restarts the dwell clock rather than inheriting the old one.
		const restaged = trackIntent(retreated, 'a', 0.1, 540)

		expect(restaged.candidate?.since).toBe(540)
	})

	it('re-stages when the hovered tile changes mid-dwell', () => {
		const staged = trackIntent(null, 'a', 0.5, 0)

		const moved = trackIntent(staged, 'b', 0.5, 50)

		expect(moved.committed).toBeNull()

		expect(moved.candidate?.intent).toEqual({ overId: 'b', zone: 'swap' })

		expect(moved.candidate?.since).toBe(50)
	})

	it('returns the same object while nothing changes, so renders can bail', () => {
		const swap = settle(null, 'a', 0.5, 0)

		expect(trackIntent(swap, 'a', 0.55, 900)).toBe(swap)

		const empty = trackIntent(null, null, 0, 0)

		expect(trackIntent(empty, null, 0, 100)).toBe(empty)
	})
})
