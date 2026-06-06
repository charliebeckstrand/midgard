import { describe, expect, it } from 'vitest'
import { ColorPanel, ColorPicker } from '../../components/color'
import {
	equalHsva,
	hexToHsva,
	hexToRgba,
	hsvaToHex,
	hsvaToRgba,
	normalizeHex,
	rgbaToHsva,
} from '../../components/color/color-utilities'
import { allBySlot, bySlot, renderUI } from '../helpers'

const within = (a: number, b: number, tolerance = 2) => Math.abs(a - b) <= tolerance

describe('color conversions', () => {
	it('round-trips fully-saturated and neutral hex exactly', () => {
		for (const hex of [
			'#ff0000',
			'#00ff00',
			'#0000ff',
			'#ffff00',
			'#00ffff',
			'#ff00ff',
			'#ffffff',
			'#000000',
			'#808080',
		]) {
			const hsva = hexToHsva(hex)

			expect(hsva).not.toBeNull()
			expect(hsvaToHex(hsva as NonNullable<typeof hsva>)).toBe(hex)
		}
	})

	it('round-trips arbitrary hex within rounding tolerance', () => {
		for (const hex of ['#3b82f6', '#7f3fbf', '#14b8a6']) {
			const out = hsvaToHex(hexToHsva(hex) as NonNullable<ReturnType<typeof hexToHsva>>)

			const a = hexToRgba(hex) as NonNullable<ReturnType<typeof hexToRgba>>
			const b = hexToRgba(out) as NonNullable<ReturnType<typeof hexToRgba>>

			expect(within(a.r, b.r)).toBe(true)
			expect(within(a.g, b.g)).toBe(true)
			expect(within(a.b, b.b)).toBe(true)
		}
	})

	it('parses shorthand and alpha hex, rejecting junk', () => {
		expect(hexToRgba('#abc')).toEqual({ r: 170, g: 187, b: 204, a: 1 })
		expect(hexToRgba('ff0000')).toEqual({ r: 255, g: 0, b: 0, a: 1 })
		expect(hexToRgba('#ff000080')?.a).toBeCloseTo(0.502, 2)
		expect(hexToRgba('not-a-color')).toBeNull()
		expect(hexToRgba('#12345')).toBeNull()
	})

	it('emits an 8-digit hex when alpha is requested', () => {
		expect(hsvaToHex({ h: 0, s: 100, v: 100, a: 1 }, true)).toBe('#ff0000ff')
		expect(hsvaToHex({ h: 0, s: 100, v: 100, a: 0.5 }, true)).toBe('#ff000080')
	})

	it('keeps rgb exact through an HSVA round-trip (lossless internal precision)', () => {
		const rgba = { r: 12, g: 200, b: 90, a: 1 }

		expect(hsvaToRgba(rgbaToHsva(rgba))).toEqual(rgba)
	})

	it('reaches every byte value on a channel — the RGB inputs never snap', () => {
		// Regression guard: integer-HSV storage used to make some byte values
		// unreachable (typing 200 would settle on 199). Full-precision HSV makes
		// every RGB round-trip exact.
		for (let n = 0; n <= 255; n++) {
			const base = { r: n, g: 100, b: 200, a: 1 }

			expect(hsvaToRgba(rgbaToHsva(base))).toEqual(base)
		}
	})

	it('ignores hue when saturation or value collapses it', () => {
		expect(equalHsva({ h: 0, s: 0, v: 100, a: 1 }, { h: 200, s: 0, v: 100, a: 1 })).toBe(true)
		expect(equalHsva({ h: 0, s: 0, v: 0, a: 1 }, { h: 200, s: 0, v: 0, a: 1 })).toBe(true)
		expect(equalHsva({ h: 0, s: 100, v: 100, a: 1 }, { h: 120, s: 100, v: 100, a: 1 })).toBe(false)
	})

	it('normalizes hex for swatch comparison', () => {
		expect(normalizeHex('#ABC')).toBe('#aabbcc')
		expect(normalizeHex('#GGG')).toBeNull()
	})
})

describe('ColorPanel', () => {
	it('renders the area, a hue slider, hex input, and swatches', () => {
		const { container } = renderUI(<ColorPanel defaultValue="#3b82f6" />)

		expect(bySlot(container, 'color-panel')).toBeInTheDocument()
		expect(bySlot(container, 'color-area')).toBeInTheDocument()
		expect(bySlot(container, 'color-slider')).toHaveAttribute('data-channel', 'hue')
		expect(bySlot(container, 'color-hex-input')).toBeInTheDocument()
		expect(allBySlot(container, 'color-swatch').length).toBeGreaterThan(0)
	})

	it('adds the alpha slider only when alpha is enabled', () => {
		const { container: opaque } = renderUI(<ColorPanel defaultValue="#3b82f6" />)
		expect(allBySlot(opaque, 'color-slider')).toHaveLength(1)

		const { container: translucent } = renderUI(<ColorPanel alpha defaultValue="#3b82f6" />)
		expect(allBySlot(translucent, 'color-slider')).toHaveLength(2)
	})

	it('hides the swatches when swatches is false', () => {
		const { container } = renderUI(<ColorPanel defaultValue="#3b82f6" swatches={false} />)

		expect(allBySlot(container, 'color-swatch')).toHaveLength(0)
	})

	it('renders a placeholder in skeleton mode', () => {
		const { container } = renderUI(<ColorPanel />, { skeleton: true })

		expect(bySlot(container, 'color-panel')).not.toBeInTheDocument()
		expect(bySlot(container, 'placeholder')).toBeInTheDocument()
	})
})

describe('ColorPicker', () => {
	it('renders a dialog trigger with a colour swatch', () => {
		const { container } = renderUI(<ColorPicker defaultValue="#ef4444" />)

		const button = bySlot(container, 'color-picker-button')

		expect(button).toBeInTheDocument()
		expect(button).toHaveAttribute('aria-haspopup', 'dialog')
		expect(button).toHaveAttribute('aria-expanded', 'false')
		expect(bySlot(container, 'color-picker-swatch')).toBeInTheDocument()
	})

	it('renders a control skeleton in skeleton mode', () => {
		const { container } = renderUI(<ColorPicker />, { skeleton: true })

		expect(bySlot(container, 'color-picker-button')).not.toBeInTheDocument()
		expect(bySlot(container, 'placeholder')).toBeInTheDocument()
	})
})
