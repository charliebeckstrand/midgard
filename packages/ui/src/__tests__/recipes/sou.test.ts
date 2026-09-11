import { describe, expect, it } from 'vitest'
import { k as pdfViewer } from '../../recipes/kata/pdf-viewer'
import { k as popover } from '../../recipes/kata/popover'
import { sou } from '../../recipes/kiso/sou'

/**
 * The stacking ladder, asserted as a ladder.
 *
 * Every rung is read by a surface that portals out of the page's own stacking contexts, where
 * DOM order decides nothing and the number is the whole contract — so the only thing that can
 * be wrong here is the *order*, and the only way it goes wrong is quietly: two surfaces given
 * the same rung look correct until the one that mounts second happens to be the one that
 * should have been underneath. That is exactly how the PDF viewer's hover loupe came to be
 * covered by a tooltip anchored to the region it was magnifying.
 */
describe('sou', () => {
	/** In ladder order, bottom to top. The names are the contract; the numbers are an artefact. */
	const LADDER = ['overlay', 'chrome', 'float', 'lens', 'toast'] as const

	function rung(name: (typeof LADDER)[number]): number {
		const value = sou[name]

		const parsed = Number(value.replace(/^z-/, ''))

		expect(Number.isInteger(parsed)).toBe(true)

		return parsed
	}

	it('covers every rung and nothing else', () => {
		expect(Object.keys(sou).sort()).toEqual([...LADDER].sort())
	})

	it('rises strictly, so no two surfaces are left to DOM order', () => {
		const values = LADDER.map(rung)

		for (const [index, value] of values.entries()) {
			if (index === 0) continue

			expect(value).toBeGreaterThan(values[index - 1] as number)
		}
	})

	/*
	 * The two that actually collided, named directly: a loupe magnifies content, a tooltip
	 * describes it, and a description that lands inside the magnifier hides its subject.
	 */
	it('puts the lens above every anchored float', () => {
		expect(rung('lens')).toBeGreaterThan(rung('float'))
	})

	/* Unconditional means unconditional — a lens does not get to cover a toast either. */
	it('keeps the toast on top', () => {
		expect(rung('toast')).toBe(Math.max(...LADDER.map(rung)))
	})

	/*
	 * The pairing that actually broke, end to end rather than within this table: the loupe
	 * wears `sou.lens` and every floating panel — a tooltip among them — wears `popover.portal`.
	 * Asserting the two recipes rather than the two rungs is what catches a future edit that
	 * moves either one back onto `float`.
	 */
	it('lifts the pdf loupe above the rung every floating panel portals on', () => {
		expect(pdfViewer.viewport.page.magnifier.lens).toContain(sou.lens)

		expect(popover.portal).toContain(sou.float)

		expect(rung('lens')).toBeGreaterThan(rung('float'))
	})
})
