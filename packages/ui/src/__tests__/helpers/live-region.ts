import { waitFor } from '@testing-library/react'
import { expect } from 'vitest'
import { FIRST_WRITE_DELAY_MS } from '../../core/announcer'
import { nextPaint } from './frames'

/**
 * The announcer's live region on `document.body`, or null before the first
 * announcement creates it.
 */
export function liveRegion(politeness: 'polite' | 'assertive' = 'polite'): HTMLElement | null {
	return document.body.querySelector(`[data-slot="live-region"][aria-live="${politeness}"]`)
}

/**
 * Waits for the announcer's live region to contain `text`.
 *
 * @remarks
 * The announcer writes on a queued microtask (core/announcer.ts), and the first
 * write after it creates a region waits for the next paint and then
 * `FIRST_WRITE_DELAY_MS`, so the text lands after the act() that triggered it;
 * polling keeps the wait on RTL's CI-scaled budget instead of a hand-rolled
 * flush.
 *
 * Real timers only: waitFor's polling rides the clock, so under installed
 * fake timers this deadlocks — assert on {@link liveRegion} after driving the
 * clock instead. The first write of a region waits for a frame and then a
 * timer of `FIRST_WRITE_DELAY_MS`, so drive the clock past both.
 */
export async function expectAnnouncement(
	text: string | RegExp,
	politeness: 'polite' | 'assertive' = 'polite',
): Promise<void> {
	await waitFor(() => expect(liveRegion(politeness)).toHaveTextContent(text))
}

/**
 * Waits until the announcer has written the first text of each region that it
 * created before the call: the next paint, then `FIRST_WRITE_DELAY_MS`.
 *
 * @remarks
 * Use it before a check that the region holds no text, so that the check can
 * fail. The wait starts its frame callback and its timer after the ones of the
 * announcer, so they run after them. Real timers only.
 */
export async function flushAnnouncer(): Promise<void> {
	await nextPaint()

	await new Promise<void>((resolve) => {
		setTimeout(resolve, FIRST_WRITE_DELAY_MS)
	})
}
