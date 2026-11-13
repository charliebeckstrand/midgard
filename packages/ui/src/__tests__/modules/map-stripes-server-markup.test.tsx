// @vitest-environment node
import { renderToString } from 'react-dom/server'
import { describe, expect, it } from 'vitest'
import { categoricalPlat } from '../helpers/map-plat'

/**
 * The server markup of a striped category.
 *
 * Before the box is measured, the canonical frame scales to meet a box that
 * no render knows. A tile in frame units then draws narrower or wider than its
 * width in pixels. The region fill therefore names an outer pattern over the
 * frame, whose group a rule scales to one pixel for each unit, and the tile
 * paints a rect in that group.
 */

const STRIPED = {
	categories: [{ value: 'West', color: 'blue' as const, stripes: 'red' as const }],
}

/** The pattern id that the fill of the first striped region names. */
function patternFill(html: string): string {
	return /<path data-region-index="\d+"[^>]*fill="url\(#([^)]+)\)"/.exec(html)?.[1] ?? ''
}

describe('MapRegions stripes server markup', () => {
	it('fills from an outer pattern whose group draws the tile at one unit for each pixel', () => {
		const html = renderToString(categoricalPlat({ ...STRIPED, width: undefined }))

		const id = patternFill(html)

		expect(id).not.toBe('')

		// The outer pattern covers the canonical frame, and its rect paints the tile.
		const outer = new RegExp(`<pattern id="${id}"[^>]*>(.*?)</pattern>`).exec(html)?.[1] ?? ''

		const scope = /<g data-map-stripes="([^"]+)"/.exec(outer)?.[1] ?? ''

		expect(scope).not.toBe('')

		expect(outer).toContain(`fill="url(#${id}-tile)"`)

		expect(html).toContain(`<pattern id="${id}-tile"`)

		// The rule scales the group by the frame width over its drawn width, with
		// the division that WebKit gets right last.
		const rule = new RegExp(`\\[data-map-stripes="${scope}"\\]\\{([^}]*)\\}`).exec(html)?.[1] ?? ''

		const [first, last] = rule.split(';')

		expect(first).toMatch(/^transform:scale\(calc\(\d+ \/ tan\(atan2\(/)

		expect(last).toMatch(/^transform:scale\(calc\(\d+px \/ min\(100cqw/)
	})

	it('fills from the tile itself in a frame of fixed width', () => {
		const html = renderToString(categoricalPlat({ ...STRIPED, width: 400 }))

		const id = patternFill(html)

		expect(html).toMatch(new RegExp(`<pattern id="${id}"[^>]*patternTransform="rotate\\(45\\)`))

		expect(html).not.toContain('data-map-stripes')
	})
})
