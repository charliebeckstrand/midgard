// @vitest-environment node
import { renderToString } from 'react-dom/server'
import { describe, expect, it } from 'vitest'
import { type MapOverlaySelection, MapPlat, MapPoint, MapPoints } from '../../modules/map'
import { FIXTURE_GEOJSON } from '../helpers/map-geography'

/**
 * The server markup of a plat that measures its own box.
 *
 * The server has no width, so the dots cannot group for one width. A mark that
 * knows its color draws the groups of every width, each with a container query
 * on the plot that shows it in its range of widths alone. The first paint then
 * shows the dots before the scripts run.
 */

/** Two dots a fraction of a degree apart, and one far from them. */
const POINTS = [
	{ at: [5, 5] as [number, number] },
	{ at: [5.3, 5] as [number, number] },
	{ at: [25, 5] as [number, number] },
]

/** The count of each match of `pattern` in the markup. */
function count(markup: string, pattern: string): number {
	return markup.split(pattern).length - 1
}

/** The server markup of a plat with no width, over the fixture geography. */
function markup(points: React.ReactNode, picks?: readonly MapOverlaySelection[]): string {
	return renderToString(
		<MapPlat aria-label="Test map" geography={FIXTURE_GEOJSON} selectedOverlays={picks}>
			{points}
		</MapPlat>,
	)
}

describe('MapPoints server markup', () => {
	it('draws the groups of every width, each with the query of its range', () => {
		const html = markup(<MapPoints id="stops" label="Stops" color="blue" points={POINTS} />)

		// The pair draws as two dots in a wide frame and as one summary in a narrow
		// one. The far dot draws alone at every width, so it needs no query.
		expect(count(html, 'data-slot="map-points-dot"')).toBe(3)

		expect(count(html, 'data-slot="map-points-cluster"')).toBe(1)

		expect(count(html, '<g data-map-band=')).toBe(4)

		expect(count(html, '@container map-plot')).toBe(3)
	})

	it('scales each group to its size in pixels by a division that WebKit gets right', () => {
		const html = markup(<MapPoints id="stops" label="Stops" color="blue" points={POINTS} />)

		const rule = /\[data-map-band\^="[^"]+-"\]\{([^}]*)\}/.exec(html)?.[1] ?? ''

		// WebKit 26 gives 0 for `tan(atan2())` of a length in `cq` units, so the last
		// declaration divides the lengths. A browser that cannot divide them drops
		// it and keeps the first.
		const [first, last] = rule.split(';')

		expect(first).toMatch(/^transform:scale\(calc\(\d+ \/ tan\(atan2\(/)

		expect(last).toMatch(/^transform:scale\(calc\(\d+px \/ min\(100cqw/)

		expect(count(html, 'transform-origin:')).toBe(4)
	})

	it('draws nothing for a mark whose color comes from the ledger', () => {
		// The slot of such a mark is known only after it registers.
		const html = markup(<MapPoints id="stops" label="Stops" points={POINTS} />)

		expect(html).not.toContain('data-slot="map-points"')
	})

	it('leaves the other marks to the hydration', () => {
		// The early color is for the dots of a set alone. The other marks draw their
		// paths in the measured frame.
		const html = markup(<MapPoint id="depot" label="Depot" color="blue" at={[5, 5]} />)

		expect(html).not.toContain('data-slot="map-point"')
	})

	it('draws each dot alone where the grouping is off', () => {
		const html = markup(
			<MapPoints id="stops" label="Stops" color="blue" cluster={false} points={POINTS} />,
		)

		expect(count(html, 'data-slot="map-points-dot"')).toBe(3)

		expect(html).not.toContain('@container map-plot')
	})

	it('haloes each group of every width that holds a pick', () => {
		const dots = <MapPoints id="stops" label="Stops" color="blue" points={POINTS} />

		// The second point draws alone in a wide frame and in the summary of a
		// narrow one, and the far point draws alone at every width.
		const html = markup(dots, [
			{ id: 'stops', index: 1 },
			{ id: 'stops', index: 2 },
		])

		expect(count(html, 'data-slot="map-points-selected"')).toBe(3)

		// A pick with no index names the first point.
		expect(count(markup(dots, [{ id: 'stops' }]), 'data-slot="map-points-selected"')).toBe(2)
	})

	it('haloes nothing for a pick of another mark', () => {
		const html = markup(<MapPoints id="stops" label="Stops" color="blue" points={POINTS} />, [
			{ id: 'depots', index: 0 },
		])

		expect(html).not.toContain('data-slot="map-points-selected"')
	})
})
