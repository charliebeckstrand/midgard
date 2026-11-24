// @vitest-environment node
import { describe, expect, vi } from 'vitest'
import { createTooltipGroup } from '../../components/tooltip/tooltip-group'
import { it } from '../helpers/fake-clock'

describe('createTooltipGroup', () => {
	it('is warm while a tooltip is open and for the grace period after the close', async ({
		clock,
	}) => {
		const group = createTooltipGroup(() => 300)

		const onChange = vi.fn()

		group.subscribe(onChange)

		expect(group.warm()).toBe(false)

		const close = group.open(vi.fn())

		expect(group.warm()).toBe(true)

		close()

		await clock.advance(299)

		expect(group.warm()).toBe(true)

		await clock.advance(1)

		expect(group.warm()).toBe(false)

		// One call for each change of `warm`.
		expect(onChange).toHaveBeenCalledTimes(2)
	})

	it('hands over from the open tooltip to the next, and the old close starts no grace period', async ({
		clock,
	}) => {
		const group = createTooltipGroup(() => 300)

		const first = vi.fn()

		const closeFirst = group.open(first)

		const closeSecond = group.open(vi.fn())

		expect(first).toHaveBeenCalledOnce()

		// The close of the first tooltip comes after the handover.
		closeFirst()

		await clock.advance(1000)

		expect(group.warm()).toBe(true)

		closeSecond()

		await clock.advance(300)

		expect(group.warm()).toBe(false)
	})

	it('stays warm when a tooltip opens in the grace period', async ({ clock }) => {
		const group = createTooltipGroup(() => 300)

		group.open(vi.fn())()

		await clock.advance(200)

		group.open(vi.fn())

		await clock.advance(1000)

		expect(group.warm()).toBe(true)
	})

	it('stops the grace period on dispose', async ({ clock }) => {
		const group = createTooltipGroup(() => 300)

		group.open(vi.fn())()

		group.dispose()

		await clock.advance(1000)

		// No timer ran, so the group did not turn cold.
		expect(group.warm()).toBe(true)
	})
})
