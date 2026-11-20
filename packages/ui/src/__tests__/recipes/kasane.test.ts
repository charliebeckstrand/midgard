// @vitest-environment node
import { describe, expect, it } from 'vitest'
import { kasane } from '../../recipes/kiso/kasane'

const { layers, softLayers } = kasane

describe('kasane.layers', () => {
	// Both decorative pseudo-element layers sit absolutely over the frame and must
	// stay transparent to pointer events; otherwise the `::before`/`::after`
	// (which belong to the frame) intercept clicks and cursors meant for the
	// non-positioned affix slots below them. The leak is light-mode only because
	// `surface.default` hides `::before` in dark mode: see layers.ts.
	it('keeps the inset fill from capturing pointer events', () => {
		expect(layers.join(' ')).toContain('before:pointer-events-none')
	})

	it('keeps the overlay ring from capturing pointer events', () => {
		expect(layers.join(' ')).toContain('after:pointer-events-none')
	})
})

describe('kasane.softLayers', () => {
	const soft = softLayers.join(' ')

	// A soft control sits on a glass panel. A ring there reads as a line over
	// the blur, so the stack has no base ring, no hover ring, and no inset fill.
	it('draws no base ring, hover ring, or inset fill', () => {
		expect(soft).not.toMatch(/(^| )ring-zinc-\d+/)
		expect(soft).not.toContain('hover:ring-')
		expect(soft).not.toContain('before:absolute')
	})

	it('fills with a wash that deepens on hover, except when disabled', () => {
		expect(softLayers).toContain('bg-zinc-500/15')
		expect(softLayers).toContain('not-has-[>:disabled]:hover:bg-zinc-500/30')
	})

	it('keeps the focus, validation, and disabled states of the framed stack', () => {
		for (const state of [
			'focus-within:after:ring-2',
			'has-[[data-invalid]]:after:ring-red-600',
			'has-[>:disabled]:opacity-50',
		]) {
			expect(soft).toContain(state)
			expect(layers.join(' ')).toContain(state)
		}
	})
})
