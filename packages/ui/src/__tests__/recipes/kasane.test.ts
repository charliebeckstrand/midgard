// @vitest-environment node
import { describe, expect, it } from 'vitest'
import { kasane } from '../../recipes/kiso/kasane'

const { layers } = kasane

describe('kasane.layers', () => {
	// Both decorative pseudo-element layers sit absolutely over the frame and must
	// stay transparent to pointer events; otherwise the `::before`/`::after`
	// (which belong to the frame) intercept clicks and cursors meant for the
	// non-positioned affix slots below them. The leak is light-mode only because
	// `surface.default` hides `::before` in dark mode — see layers.ts.
	it('keeps the inset fill from capturing pointer events', () => {
		expect(layers.inset.join(' ')).toContain('before:pointer-events-none')
	})

	it('keeps the overlay ring from capturing pointer events', () => {
		expect(layers.overlay.join(' ')).toContain('after:pointer-events-none')
	})

	it('carries both pointer-events guards through the bundled all stack', () => {
		const all = layers.all.join(' ')

		expect(all).toContain('before:pointer-events-none')

		expect(all).toContain('after:pointer-events-none')
	})
})
