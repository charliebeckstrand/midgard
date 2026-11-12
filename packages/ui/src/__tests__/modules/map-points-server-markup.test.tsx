// @vitest-environment node
import { renderToString } from 'react-dom/server'
import { describe, expect, it } from 'vitest'
import { MapPlat, MapPoints } from '../../modules/map'
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
function markup(points: React.ReactNode): string {
	return renderToString(
		<MapPlat aria-label="Test map" geography={FIXTURE_GEOJSON}>
			{points}
		</MapPlat>,
	)
}

describe('MapPoints server markup', () => {
	it('draws the groups of every width, each with the query of its range', () => {
		const html = markup(<MapPoints id="stops" label="Stops" color="blue" points={POINTS} />)

		// The pair draws as two dots in a wide frame and as one summary in a narrow
		// one. The far dot draws alone at every width.
		expect(count(html, 'data-slot="map-points-dot"')).toBe(3)

		expect(count(html, 'data-slot="map-points-cluster"')).toBe(1)

		expect(count(html, '<g data-map-band=')).toBe(4)

		expect(count(html, '@container map-plot')).toBe(4)
	})

	it('draws nothing for a mark whose color comes from the ledger', () => {
		// The slot of such a mark is known only after it registers.
		const html = markup(<MapPoints id="stops" label="Stops" points={POINTS} />)

		expect(html).not.toContain('data-slot="map-points"')
	})

	it('draws each dot alone where the grouping is off', () => {
		const html = markup(
			<MapPoints id="stops" label="Stops" color="blue" cluster={false} points={POINTS} />,
		)

		expect(count(html, 'data-slot="map-points-dot"')).toBe(3)

		expect(html).not.toContain('<g data-map-band=')
	})
})
