import { beforeAll, describe, expect, it } from 'vitest'
import { page, userEvent } from 'vitest/browser'
import { MapGeofence, MapPlat, MapPoint } from '../../modules/map'
import { allBySlot, bySlot, renderUI, waitFor } from '../helpers'
import { FIXTURE_GEOJSON } from '../helpers/map-geography'

/**
 * The legend's side rail: every entry holds one line inside the reserved column,
 * its keys centred on the name beside them, and a name too wide for the column
 * clips to an ellipsis and hands itself back through a reveal tooltip. Each claim
 * is a computed-layout one — the reserved width, the clip, the optical centre —
 * that jsdom cannot measure with no layout engine, so they ride the real browser.
 */
describe('map legend rail (real browser)', () => {
	// The panel is `lg`-gated on the viewport, so the rail below is the side column
	// these assertions measure rather than the stacked row under the plot.
	beforeAll(() => page.viewport(1280, 800))

	/** Three depots, each a catchment merged with the depot standing inside it. */
	function depots(cities: { city: string; detail: string }[]) {
		return renderUI(
			<MapPlat aria-label="Depot catchments" geography={FIXTURE_GEOJSON} width={520} legend="right">
				{cities.map(({ city, detail }, index) => (
					<MapGeofence
						key={city}
						label={city}
						group={city}
						at={[8 + index * 3, 5]}
						radius={300_000}
						detail={detail}
					/>
				))}

				{cities.map(({ city }, index) => (
					<MapPoint key={city} label={city} group={city} at={[8 + index * 3, 5]} detail="Depot" />
				))}
			</MapPlat>,
		)
	}

	it('holds every entry inside the reserved column, one line each', async () => {
		const { container } = depots([
			{ city: 'Dallas', detail: 'Next day' },
			{ city: 'Los Angeles', detail: 'Same day' },
		])

		const box = bySlot(container, 'map-legend-box') as HTMLElement

		await waitFor(() => expect(allBySlot(container, 'map-legend-item')).toHaveLength(2))

		const rail = box.getBoundingClientRect()

		const entries = allBySlot(container, 'map-legend-item') as HTMLElement[]

		// The line every entry is measured against, read once — the loop below asks
		// only whether the others match it.
		const line = (entries[0] as HTMLElement).getBoundingClientRect().height

		for (const entry of entries) {
			const rect = entry.getBoundingClientRect()

			// Inside the rail, not merely starting in it. The column tracks at
			// `minmax(0, 1fr)` for this: an implicit track is max-content, and a name
			// that never wraps contributed its whole width to it, so the entries used to
			// overhang the column reserved for them.
			expect(rect.right).toBeLessThanOrEqual(rail.right + 1)

			// One line, whatever the entry carries — the readout sits beside the name
			// rather than under it, and the name clips instead of wrapping.
			expect(rect.height).toBeCloseTo(line, 0)
		}
	})

	it('centres an entry’s keys on the name beside them', async () => {
		const { container } = depots([{ city: 'Dallas', detail: 'Next day' }])

		await waitFor(() => expect(allBySlot(container, 'map-legend-item')).toHaveLength(1))

		const entry = bySlot(container, 'map-legend-item') as HTMLElement

		const label = bySlot(entry, 'map-legend-label') as HTMLElement

		// The name's own painted box, through a Range over its contents — the label
		// span stretches to the column, so its bounding rect is not what the keys read
		// as centred against.
		const range = document.createRange()

		range.selectNodeContents(label)

		const text = range.getBoundingClientRect()

		const textMiddle = text.top + text.height / 2

		// Both keys of the merged pair, the square and the dot, sit on that middle.
		for (const key of allBySlot(entry, 'swatch') as HTMLElement[]) {
			const rect = key.getBoundingClientRect()

			expect(Math.abs(rect.top + rect.height / 2 - textMiddle)).toBeLessThan(1)
		}
	})

	it('clips a name too wide for the rail and reveals it, leaving one that fits bare', async () => {
		const { container } = depots([
			{ city: 'Dallas–Fort Worth metroplex catchment', detail: 'Next day' },
			{ city: 'Reno', detail: 'Same day' },
		])

		await waitFor(() => expect(allBySlot(container, 'map-legend-item')).toHaveLength(2))

		const entries = allBySlot(container, 'map-legend-item') as HTMLElement[]

		const clip = (entry: HTMLElement) => entry.querySelector('.truncate') as HTMLElement

		const [long, short] = entries as [HTMLElement, HTMLElement]

		await waitFor(() => expect(clip(long).scrollWidth).toBeGreaterThan(clip(long).clientWidth))

		// The detector measures lazily — an entry no pointer visits pays no layout
		// read — so contact arms it. Nothing observes the flag before then, which makes
		// the hover a precondition here rather than part of the claim.
		await userEvent.hover(long)

		await waitFor(() => expect(long.className).toContain('cursor-help'))

		// The name that fits neither clips nor arms, on the same contact.
		expect(clip(short).scrollWidth).toBeLessThanOrEqual(clip(short).clientWidth)

		await userEvent.hover(short)

		expect(short.className).not.toContain('cursor-help')
	})
})
