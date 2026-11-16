import { describe, expect, it, onTestFinished } from 'vitest'
import { Calendar, CalendarSkeleton } from '../../../components/calendar'
import { densitySteps } from '../../../core/density'
import { getSlot, present, renderUI, userEvent } from '../../helpers'
import { overlappingHitAreas } from './helpers/geometry-invariants'

/**
 * The days of a calendar touch, so the hit areas cannot grow past them. On a
 * coarse pointer, the touch pitch (`core/touch/pitch.ts`) gives each day the
 * 44px floor, and the root gives room for seven of them. On iOS, a finger hit
 * the next day of a 39px grid.
 *
 * This suite cannot match `pointer: coarse` (see
 * `touch-target-geometry.test.tsx`). Each coarse case therefore copies each
 * `(pointer: coarse)` rule of the page out of its media query, into the same
 * cascade layer. The real CSS of the build then lays out the coarse page under
 * a fine pointer.
 */

/** The media text of a coarse pointer. */
const COARSE = /\(pointer:\s*coarse\)/

/** The coarse floor of `TouchTarget` and of the touch pitch, in px. */
const FLOOR = 44

/** The text of each `(pointer: coarse)` rule in `rules`, in its cascade layer. */
function coarseRules(rules: CSSRuleList, layer: string[]): string[] {
	return [...rules].flatMap((rule) => {
		if (rule instanceof CSSLayerBlockRule) return coarseRules(rule.cssRules, [...layer, rule.name])

		if (!(rule instanceof CSSMediaRule)) return []

		if (!COARSE.test(rule.conditionText)) return coarseRules(rule.cssRules, layer)

		const body = [...rule.cssRules].map((inner) => inner.cssText).join('\n')

		return [layer.length ? `@layer ${layer.join('.')} {\n${body}\n}` : body]
	})
}

/** Applies each `(pointer: coarse)` rule of the page until the case ends. */
function coarsePointer() {
	const text = [...document.styleSheets].flatMap((sheet) => coarseRules(sheet.cssRules, []))

	const style = document.createElement('style')

	style.textContent = text.join('\n')

	document.head.append(style)

	onTestFinished(() => style.remove())

	return text.length
}

/** A month that spans six weeks, the tallest month a calendar draws. */
const MONTH = new Date(2026, 4, 15)

/** The width and the height of each option of the first listbox in `root`. */
function optionSizes(root: HTMLElement) {
	return [...root.querySelectorAll<HTMLElement>('[role="listbox"] [role="option"]')].map(
		(option) => {
			const { width, height } = option.getBoundingClientRect()

			return { width, height }
		},
	)
}

describe('the touch pitch of Calendar', () => {
	it('finds the coarse rules of the page', () => {
		expect(coarsePointer()).toBeGreaterThan(0)
	})

	it.each(densitySteps)('gives each day the coarse floor at %s', (size) => {
		coarsePointer()

		const { container } = renderUI(<Calendar size={size} defaultValue={MONTH} />)

		const sizes = optionSizes(container)

		expect(sizes).toHaveLength(31)

		for (const { width, height } of sizes) {
			expect(width).toBeGreaterThanOrEqual(FLOOR - 0.5)

			expect(height).toBeGreaterThanOrEqual(FLOOR - 0.5)
		}

		expect(overlappingHitAreas(container)).toEqual([])
	})

	it('gives each month of the picker the coarse floor', async () => {
		coarsePointer()

		const { container } = renderUI(<Calendar size="sm" defaultValue={MONTH} />)

		// The month button of the header opens the picker in a popover.
		const trigger = getSlot(container, 'calendar').querySelector('button:not([aria-label])')

		await userEvent.click(present(trigger, 'the month button'))

		const dialog = present(document.querySelector('[role="dialog"]'), 'the picker popover')

		const sizes = optionSizes(dialog)

		expect(sizes).toHaveLength(12)

		for (const { height } of sizes) expect(height).toBeGreaterThanOrEqual(FLOOR - 0.5)

		expect(overlappingHitAreas(dialog)).toEqual([])
	})

	it.each(densitySteps)('keeps the skeleton the box of the calendar at %s', (size) => {
		coarsePointer()

		const real = getSlot(
			renderUI(<Calendar size={size} defaultValue={MONTH} />).container,
			'calendar',
		)

		const skeleton = present(
			renderUI(<CalendarSkeleton size={size} />).container.firstElementChild,
			'the skeleton',
		)

		const a = real.getBoundingClientRect()

		const b = skeleton.getBoundingClientRect()

		expect([b.width, b.height]).toEqual([a.width, a.height])
	})

	it('keeps the size of each day on a fine pointer', () => {
		const { container } = renderUI(<Calendar size="md" defaultValue={MONTH} />)

		const [first] = optionSizes(container)

		expect(first?.width).toBeLessThan(FLOOR - 0.5)
	})
})
