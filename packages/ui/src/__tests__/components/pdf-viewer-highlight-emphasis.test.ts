// @vitest-environment node
import { describe, expect, it } from 'vitest'
import { k } from '../../recipes/kata/pdf-viewer'

/**
 * How a page of regions says which one is selected.
 *
 * These assert the *composed* classes rather than a rendered box, because the composition is
 * where this goes wrong: each palette color is a light/dark pair, and an override that
 * supplies only the base leaves the `dark:` half of the old value standing, correct in light
 * mode and silently inert in dark. That has bitten this surface twice.
 */

const resting = k({ color: 'amber', active: false }).viewport.page.highlights.region

const selected = k({ color: 'amber', active: true }).viewport.page.highlights.region

const dimmed = k({ color: 'amber', active: false, dimmed: true }).viewport.page.highlights.region

describe('a region at rest', () => {
	it('carries its own color, softly', () => {
		expect(resting).toContain('bg-amber-500/15')
		expect(resting).toContain('ring-amber-500')
	})

	/*
	 * A region is a control, and nothing else on the layer said so: the fill and the stroke are
	 * identical whether the boxes are pressable or decoration beside a field list.
	 *
	 * A width step inside the resting edge rather than the selected wash: a hover that previewed
	 * `active.fill` would say the region is chosen a moment before it is.
	 */
	it('thickens its stroke under the pointer', () => {
		expect(resting).toContain('hover:ring-2')
		expect(resting).not.toContain('hover:bg-amber-500/30')
	})

	/** Still findable, still interactive: the neutral wash keeps the hover cue. */
	it('keeps the cue while another region is selected', () => {
		expect(dimmed).toContain('hover:ring-2')
	})
})

describe('the selected region', () => {
	/** At 15% over printed ink a heavier ring alone was not enough to see. */
	it('deepens its wash and thickens its stroke', () => {
		expect(selected).toContain('bg-amber-500/30')
		expect(selected).toContain('ring-2')
	})

	/** A region is often one line of text high. An inset stroke covered the ink that it marks. */
	it('draws its stroke outside the box, so the ink stays visible', () => {
		expect(selected).not.toContain('ring-inset')
		expect(resting).toContain('ring-inset')
	})

	/** Regions paint in document order, so an overlapping neighbor could cover the emphasis. */
	it('lifts above its neighbors', () => {
		expect(selected).toContain('z-10')
	})
})

describe('every other region while one is selected', () => {
	it('loses its color — both halves of every pair', () => {
		expect(dimmed).not.toContain('bg-amber-500/15')
		expect(dimmed).not.toContain('ring-amber-500')
		expect(dimmed).not.toContain('dark:ring-amber-600')
	})

	/**
	 * Only the color. Blanking them would answer "which is selected" by destroying the answer
	 * to "where is everything else".
	 */
	it('keeps a fill and a ring, so it is still findable', () => {
		expect(dimmed).toContain('bg-zinc-500/15')
		expect(dimmed).toContain('ring-zinc-800')
		expect(dimmed).toContain('dark:ring-zinc-600')
	})

	it('stays at resting weight, so only the selected one is emphasized', () => {
		expect(dimmed).toContain('ring-1')
		expect(dimmed).not.toContain('z-10')
	})
})

/**
 * The selected region takes no resting edge and no hover step. The `active` axis of the
 * `region` slot keeps them apart, and this pins the pairing that it relies on.
 */
describe('the selected region under the pointer', () => {
	it('takes no hover step, so its emphasis survives', () => {
		expect(selected).not.toContain('hover:ring-2')
	})
})
