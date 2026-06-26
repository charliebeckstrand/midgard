import { describe, expect, it, vi } from 'vitest'
import { TypeCell } from '../../../components/api-reference/type-cell'
import { allBySlot, renderUI } from '../../helpers'

describe('TypeCell', () => {
	it('renders one badge per distinct union arm, stripping literal quotes', () => {
		const { container } = renderUI(<TypeCell prop={{ name: 'size', type: "'sm' | 'md' | 'lg'" }} />)

		const badges = allBySlot(container, 'badge')

		expect(badges.map((b) => b.textContent)).toEqual(['sm', 'md', 'lg'])
	})

	it('collapses repeated arms to a single badge', () => {
		// A union can format to repeated text (e.g. two type parameters that both
		// resolve to `string`); duplicates must not render twice.
		const { container } = renderUI(<TypeCell prop={{ name: 'value', type: 'string | string' }} />)

		const badges = allBySlot(container, 'badge')

		expect(badges).toHaveLength(1)

		expect(badges[0]?.textContent).toBe('string')
	})

	it('does not emit a duplicate-key warning for repeated arms', () => {
		const spy = vi.spyOn(console, 'error').mockImplementation(() => {})

		try {
			renderUI(<TypeCell prop={{ name: 'value', type: 'string | string' }} />)

			const warnedOnKeys = spy.mock.calls.some((args) =>
				args.some((arg) => typeof arg === 'string' && arg.includes('same key')),
			)

			expect(warnedOnKeys).toBe(false)
		} finally {
			spy.mockRestore()
		}
	})
})
