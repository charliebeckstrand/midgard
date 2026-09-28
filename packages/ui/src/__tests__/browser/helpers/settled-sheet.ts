import { expect } from 'vitest'
import { getSlot } from '../../helpers'

/** Waits until the open sheet has slid in and stays in the same place, and returns its panel. */
export async function settledSheet(): Promise<HTMLElement> {
	const panel = getSlot(document.body, 'sheet')

	let last = Number.NaN

	await expect
		.poll(() => {
			const left = panel.getBoundingClientRect().left
			const still = left === last
			last = left
			return still
		})
		.toBe(true)

	return panel
}
