import { describe, expect, it } from 'vitest'
import { tsunagi } from '../../recipes/ryu/tsunagi'

describe('tsunagi', () => {
	const base = tsunagi.base.join(' ')

	it('covers every (orientation × position) combination', () => {
		const cases = [
			['horizontal', 'start'],
			['horizontal', 'middle'],
			['horizontal', 'end'],
			['vertical', 'start'],
			['vertical', 'middle'],
			['vertical', 'end'],
		] as const

		for (const [orientation, position] of cases) {
			const selector = `data-[group-orientation=${orientation}]:data-[group=${position}]:`

			expect(base, `missing rule for ${orientation}/${position}`).toContain(selector)
		}
	})

	it('uses logical-property classes (RTL-safe) for horizontal joins', () => {
		// Horizontal must mirror under dir="rtl"; directional rounded-l/r would
		// not. Logical rounded-s/e and -ms-px give the right behavior for free.
		expect(base).toContain('rounded-e-none')
		expect(base).toContain('rounded-s-none')
		expect(base).toContain('-ms-px')

		expect(base).not.toMatch(/data-\[group-orientation=horizontal\][^\s]*rounded-l-none/)
		expect(base).not.toMatch(/data-\[group-orientation=horizontal\][^\s]*rounded-r-none/)
		expect(base).not.toMatch(/data-\[group-orientation=horizontal\][^\s]*-ml-px/)
	})

	it('uses physical top/bottom for vertical joins (no RTL mirroring needed)', () => {
		expect(base).toContain('rounded-t-none')
		expect(base).toContain('rounded-b-none')
		expect(base).toContain('-mt-px')
	})

	it('emits negative-margin overlap on middle and end items', () => {
		expect(base).toContain('data-[group=middle]:-ms-px')
		expect(base).toContain('data-[group=end]:-ms-px')
		expect(base).toContain('data-[group=middle]:-mt-px')
		expect(base).toContain('data-[group=end]:-mt-px')
	})
})
