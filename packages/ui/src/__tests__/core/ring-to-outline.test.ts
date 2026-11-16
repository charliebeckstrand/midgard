// @vitest-environment node
import { describe, expect, it } from 'vitest'
import { type RingStyle, ringToOutline } from '../../core/rasterize-element'

/** The computed shadow layers of a Tailwind `ring-1 ring-inset`: four clear layers and the ring. */
const INSET_RING =
	'rgba(0, 0, 0, 0) 0px 0px 0px 0px, rgba(0, 0, 0, 0) 0px 0px 0px 0px, rgba(0, 0, 0, 0) 0px 0px 0px 0px, oklch(0.666 0.179 58.318) 0px 0px 0px 1px inset, rgba(0, 0, 0, 0) 0px 0px 0px 0px'

/** A style with no border and no outline, and the shadow `boxShadow`. */
const style = (boxShadow: string, extra: Partial<RingStyle> = {}): RingStyle => ({
	boxShadow,
	outlineStyle: 'none',
	borderTopWidth: '0px',
	...extra,
})

describe('ringToOutline', () => {
	it('draws an inset ring as an outline inside the padding box, and keeps the other layers', () => {
		expect(ringToOutline(style(INSET_RING))).toBe(
			'box-shadow:rgba(0, 0, 0, 0) 0px 0px 0px 0px,rgba(0, 0, 0, 0) 0px 0px 0px 0px,rgba(0, 0, 0, 0) 0px 0px 0px 0px,rgba(0, 0, 0, 0) 0px 0px 0px 0px;outline:1px solid oklch(0.666 0.179 58.318);outline-offset:-1px;',
		)
	})

	it('moves an inset ring in by the border', () => {
		expect(
			ringToOutline(style('rgb(1, 2, 3) 0px 0px 0px 2px inset', { borderTopWidth: '1px' })),
		).toBe('box-shadow:none;outline:2px solid rgb(1, 2, 3);outline-offset:-3px;')
	})

	it('draws an outer ring as an outline on the border box', () => {
		expect(ringToOutline(style('rgb(1, 2, 3) 0px 0px 0px 2px'))).toBe(
			'box-shadow:none;outline:2px solid rgb(1, 2, 3);outline-offset:0px;',
		)
	})

	it('keeps a shadow with an offset or a blur, a clear ring, and no shadow', () => {
		expect(ringToOutline(style('rgba(0, 0, 0, 0.3) 0px 4px 10px 0px'))).toBe('')

		expect(ringToOutline(style('rgba(0, 0, 0, 0.3) 0px 0px 4px 1px'))).toBe('')

		expect(ringToOutline(style('rgba(0, 0, 0, 0) 0px 0px 0px 1px'))).toBe('')

		expect(ringToOutline(style('none'))).toBe('')
	})

	it('keeps the rings of an element with an outline, or with two rings', () => {
		expect(ringToOutline(style('rgb(1, 2, 3) 0px 0px 0px 1px', { outlineStyle: 'solid' }))).toBe('')

		expect(ringToOutline(style('rgb(1, 2, 3) 0px 0px 0px 2px, rgb(4, 5, 6) 0px 0px 0px 4px'))).toBe(
			'',
		)
	})
})
