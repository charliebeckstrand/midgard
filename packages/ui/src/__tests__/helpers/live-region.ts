import { waitFor } from '@testing-library/react'
import { expect } from 'vitest'

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
 * The announcer writes on a queued microtask (core/announcer.ts), so the text
 * lands after the act() that triggered it; polling keeps the wait on RTL's
 * CI-scaled budget instead of a hand-rolled flush.
 *
 * Real timers only: waitFor's polling rides the clock, so under installed
 * fake timers this deadlocks — assert on {@link liveRegion} after driving the
 * clock instead.
 */
export async function expectAnnouncement(
	text: string | RegExp,
	politeness: 'polite' | 'assertive' = 'polite',
): Promise<void> {
	await waitFor(() => expect(liveRegion(politeness)).toHaveTextContent(text))
}
