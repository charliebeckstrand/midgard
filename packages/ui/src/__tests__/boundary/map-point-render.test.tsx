import { beforeEach, describe, expect, it, vi } from 'vitest'
import { MapPlat } from '../../modules/map'
import { MapPoint } from '../../modules/map/map-point'
import { act, allBySlot, allRegions, fireEvent, renderUI } from '../helpers'
import { FIXTURE_GEOJSON, FIXTURE_ROWS } from '../helpers/map-geography'

/**
 * A crossing renders only the singular marks whose dim changes.
 *
 * Each overlay mark read the whole pointed mark from context, only to decide
 * whether it dims. The pointed mark changes on each crossing, so each crossing
 * rendered each mark, also between two regions, where no mark dims or lights.
 * A legend hover republished the plat context the same way, through its
 * emphasis. Each mark now reads its own answer from one store that holds both.
 *
 * The count needs a module mock, so this suite sits in `boundary/`.
 */
vi.mock('../../modules/map/map-point', async (importActual) => {
	const actual = await importActual<typeof import('../../modules/map/map-point')>()

	return { ...actual, MapPoint: vi.fn(actual.MapPoint) }
})

/** Stops far enough apart that the frame never summarizes them. */
const STOPS: [number, number][] = [
	[3, 5],
	[9, 5],
	[15, 5],
	[21, 5],
	[27, 5],
]

function fleet() {
	return (
		<MapPlat
			aria-label="Fleet"
			geography={FIXTURE_GEOJSON}
			data={FIXTURE_ROWS}
			regionKey="state"
			categoryKey="zone"
			width={400}
		>
			{STOPS.map((at, index) => (
				<MapPoint key={at.join()} label={`Stop ${index}`} at={at} />
			))}
		</MapPlat>
	)
}

/** Fires one crossing, and returns the mark renders that it caused. */
function cross(target: Element, clientX: number) {
	vi.mocked(MapPoint).mockClear()

	act(() => {
		fireEvent.pointerEnter(target, { clientX, clientY: 20 })
	})

	return vi.mocked(MapPoint).mock.calls.length
}

describe('map singular mark renders', () => {
	beforeEach(() => {
		vi.mocked(MapPoint).mockClear()
	})

	it('renders only the marks whose dim changes on a crossing', () => {
		const { container } = renderUI(fleet())

		const [alpha, beta] = allRegions(container)

		const hits = allBySlot(container, 'map-point-hit')

		expect(hits).toHaveLength(STOPS.length)

		// The first crossing dims each mark, which is a real change.
		expect(cross(alpha as Element, 40)).toBe(STOPS.length)

		// Between two regions, no mark dims or lights.
		expect(cross(beta as Element, 200)).toBe(0)

		// From a region to a mark, only that mark lights.
		expect(cross(hits[0] as Element, 10)).toBe(1)

		// From one mark to the next, one mark dims and one lights.
		expect(cross(hits[1] as Element, 60)).toBe(2)
	})

	it('renders only the marks whose dim changes on a legend focus move', () => {
		const { container } = renderUI(fleet())

		const items = allBySlot(container, 'map-legend-item').filter((item) =>
			item.textContent?.startsWith('Stop'),
		)

		expect(items).toHaveLength(STOPS.length)

		/** Moves the legend focus onto `item`, and returns the mark renders that it caused. */
		const focus = (item: Element) => {
			vi.mocked(MapPoint).mockClear()

			act(() => {
				fireEvent.focus(item)
			})

			return vi.mocked(MapPoint).mock.calls.length
		}

		// The first emphasis dims each other mark, which is a real change.
		expect(focus(items[0] as Element)).toBe(STOPS.length - 1)

		// From one legend item to the next, one mark dims and one lights.
		expect(focus(items[1] as Element)).toBe(2)
	})
})
