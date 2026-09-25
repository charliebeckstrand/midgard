// @vitest-environment node
import { describe, expect, it } from 'vitest'
import { describePin } from '../../modules/grid/engine/grid-announcements'
import { pinMenuChoices } from '../../modules/grid/engine/grid-pin/overrides'

/**
 * The pin menu and its announcement name the physical edge a column goes to.
 * The pin targets are logical: `'left'` is the inline start. In a right-to-left
 * grid, the start is the right edge, so the words swap and the targets stay.
 */
describe('pin labels', () => {
	const labels = (side: 'left' | 'right' | undefined, rtl: boolean) =>
		pinMenuChoices(side, rtl).map(({ label, target }) => [label, target])

	it('names the edges as they are in a left-to-right grid', () => {
		expect(labels(undefined, false)).toEqual([
			['Pin left', 'left'],
			['Pin right', 'right'],
		])
	})

	it('names the physical edge of each target in a right-to-left grid', () => {
		expect(labels(undefined, true)).toEqual([
			['Pin right', 'left'],
			['Pin left', 'right'],
		])

		expect(labels('left', true)).toEqual([
			['Pin left', 'right'],
			['Unpin', false],
		])
	})

	it('announces the physical edge', () => {
		expect(describePin('Name', 'left', false)).toBe('Pinned Name to the left')

		expect(describePin('Name', 'left', true)).toBe('Pinned Name to the right')

		expect(describePin('Name', 'right', true)).toBe('Pinned Name to the left')

		expect(describePin('Name', false, true)).toBe('Unpinned Name')
	})
})
