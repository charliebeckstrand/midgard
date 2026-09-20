import { describe, expect, it } from 'vitest'
import { cn } from '../../core'
import { k } from '../../recipes/kata/pdf-viewer'

/**
 * How a page of regions says which one is selected.
 *
 * These assert the *composed* classes rather than a rendered box, because the composition is
 * where this goes wrong: each palette colour is a light/dark pair, and an override that
 * supplies only the base leaves the `dark:` half of the old value standing — correct in light
 * mode and silently inert in dark. That has bitten this surface twice.
 */

const { region } = k.viewport.page.highlights

const resting = cn(region.base, region.fill.amber, region.ring.amber, region.hover)

const selected = cn(region.base, region.activeFill.amber, region.ring.amber, region.active)

const dimmed = cn(region.base, region.fill.amber, region.ring.amber, region.hover, region.dimmed)

describe('a region at rest', () => {
	it('carries its own colour, softly', () => {
		expect(resting).toContain('bg-amber-500/15')
		expect(resting).toContain('ring-amber-500')
	})

	/*
	 * A region is a control, and nothing else on the layer said so — the fill and the stroke are
	 * identical whether the boxes are pressable or decoration beside a field list.
	 *
	 * Between `ring-1` and the selection's `ring-4`, which is the order the three states should
	 * read in, and a width step rather than the selected wash: a hover that previewed
	 * `activeFill` would say the region is chosen a moment before it is.
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
		expect(selected).toContain('ring-4')
	})

	/** Regions paint in document order, so an overlapping neighbour could cover the emphasis. */
	it('lifts above its neighbours', () => {
		expect(selected).toContain('z-10')
	})
})

describe('every other region while one is selected', () => {
	it('loses its colour — both halves of every pair', () => {
		expect(dimmed).not.toContain('bg-amber-500/15')
		expect(dimmed).not.toContain('ring-amber-500')
		expect(dimmed).not.toContain('dark:ring-amber-600')
	})

	/**
	 * Only the colour. Blanking them would answer "which is selected" by destroying the answer
	 * to "where is everything else".
	 */
	it('keeps a fill and a ring, so it is still findable', () => {
		expect(dimmed).toContain('bg-zinc-500/15')
		expect(dimmed).toContain('ring-zinc-800')
		expect(dimmed).toContain('dark:ring-zinc-600')
	})

	it('stays at resting weight, so only the selected one is emphasised', () => {
		expect(dimmed).not.toContain('ring-4')
		expect(dimmed).not.toContain('z-10')
	})
})

/**
 * `:hover` outranks a bare class, so a hover step on the selected region would beat its own
 * `ring-4` and flatten the one emphasis that says which region is selected. The composition in
 * `pdf-viewer-highlights.tsx` is what keeps them apart — this pins the pairing it relies on.
 */
describe('the selected region under the pointer', () => {
	it('takes no hover step, so its emphasis survives', () => {
		expect(selected).not.toContain('hover:ring-2')
	})
})
