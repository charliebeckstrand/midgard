import { describe, expect, it, vi } from 'vitest'
import { Grid, type GridColumn } from '../../modules/grid'
import type { GridColumnResizeHandle } from '../../modules/grid/grid-column-resize-handle'
import { useGridPinnedOffsets } from '../../modules/grid/use-grid-pinned-offsets'
import { useGridTruncation } from '../../modules/grid/use-grid-truncation'
import { act, fireEvent, frames, holdMouse, renderUI, screen } from '../helpers'

vi.mock('../../modules/grid/use-grid-truncation', async (importOriginal) => {
	const actual = await importOriginal<typeof import('../../modules/grid/use-grid-truncation')>()

	return { ...actual, useGridTruncation: vi.fn(actual.useGridTruncation) }
})

// Counts the renders of the truncating body cells. A body cell passes a settle
// subscription, and a header title passes none.
const cellRenders = () =>
	vi.mocked(useGridTruncation).mock.calls.filter(([onSettle]) => onSettle).length

// Counts the renders of each header's resize handle, by column id. A header
// that renders again renders its handle again.
const handleRenders = vi.hoisted(() => new Map<string, number>())

vi.mock('../../modules/grid/grid-column-resize-handle', async (importOriginal) => {
	const actual =
		await importOriginal<typeof import('../../modules/grid/grid-column-resize-handle')>()

	return {
		...actual,
		GridColumnResizeHandle: ((props: Parameters<typeof actual.GridColumnResizeHandle>[0]) => {
			const id = String(props.id)

			handleRenders.set(id, (handleRenders.get(id) ?? 0) + 1)

			return actual.GridColumnResizeHandle(props)
		}) as typeof GridColumnResizeHandle,
	}
})

vi.mock('../../modules/grid/use-grid-pinned-offsets', async (importOriginal) => {
	const actual = await importOriginal<typeof import('../../modules/grid/use-grid-pinned-offsets')>()

	return { ...actual, useGridPinnedOffsets: vi.fn(actual.useGridPinnedOffsets) }
})

// Counts the renders of the grid host. The host reads the pinned offsets once
// for each render.
const hostRenders = () => vi.mocked(useGridPinnedOffsets).mock.calls.length

/**
 * A drag-resize holds the truncation tooltips closed, and measures again when it
 * settles. The body cells read the drag state from the settle store when they
 * measure, so the start and the end of a drag render no body cell again.
 */
describe('Grid column drag-resize', () => {
	type Row = { id: number; city: string; name: string }

	const rows: Row[] = Array.from({ length: 50 }, (_, id) => ({
		id,
		city: `City ${id}`,
		name: `Name ${id}`,
	}))

	const columns: GridColumn<Row>[] = [
		{ id: 'city', title: 'City', cell: (row) => row.city },
		{ id: 'name', title: 'Name', cell: (row) => row.name },
	]

	/** Moves the held mouse from 110 to 150 in five steps, and waits for the frames after each step. */
	async function dragFrames() {
		for (let x = 110; x <= 150; x += 10) {
			fireEvent.mouseMove(document, { clientX: x })

			await act(frames)
		}
	}

	it('renders no truncating body cell again across a drag', () => {
		renderUI(<Grid columns={columns} rows={rows} getKey={(row) => row.id} resizable truncate />)

		expect(cellRenders()).toBeGreaterThan(0)

		vi.mocked(useGridTruncation).mockClear()

		const held = holdMouse(screen.getByRole('separator', { name: 'Resize City' }), {
			button: 0,
			clientX: 100,
		})

		fireEvent.mouseMove(document, { clientX: 130 })

		held.release({ clientX: 130 })

		expect(cellRenders()).toBe(0)
	})

	it('renders only the dragged header on each frame of a drag', async () => {
		renderUI(<Grid columns={columns} rows={rows} getKey={(row) => row.id} resizable truncate />)

		const held = holdMouse(screen.getByRole('separator', { name: 'Resize City' }), {
			button: 0,
			clientX: 100,
		})

		handleRenders.clear()

		await dragFrames()

		// Five frames move the City width, and the Name header holds.
		expect(handleRenders.get('city') ?? 0).toBeGreaterThanOrEqual(5)

		expect(handleRenders.get('name') ?? 0).toBe(0)

		held.release({ clientX: 150 })
	})

	it('holds the measure of a dragged header title until the drag settles', async () => {
		const { container } = renderUI(
			<Grid columns={columns} rows={rows} getKey={(row) => row.id} resizable truncate />,
		)

		const title = container.querySelector<HTMLElement>(
			'th[data-grid-col="city"] [data-grid-content]',
		)

		if (!title) throw new Error('City title not found')

		// A measure reads the overflow of the title, so each read counts one.
		const reads = vi.fn(() => 0)

		Object.defineProperty(title, 'scrollWidth', { configurable: true, get: reads })

		// Contact arms the measure, as the reveal it gates opens on contact.
		fireEvent.pointerOver(title)

		const held = holdMouse(screen.getByRole('separator', { name: 'Resize City' }), {
			button: 0,
			clientX: 100,
		})

		await act(frames)

		reads.mockClear()

		await dragFrames()

		// The header renders on each frame of the drag, and measures on none.
		expect(reads).not.toHaveBeenCalled()

		held.release({ clientX: 150 })

		await act(frames)

		// The settle lifts the hold and measures again.
		expect(reads).toHaveBeenCalled()
	})

	it('renders the host once on each frame of a drag of a frozen column', async () => {
		const frozen: GridColumn<Row>[] = [
			{ ...(columns[0] as GridColumn<Row>), pinned: 'left' },
			columns[1] as GridColumn<Row>,
		]

		renderUI(<Grid columns={frozen} rows={rows} getKey={(row) => row.id} resizable />)

		const held = holdMouse(screen.getByRole('separator', { name: 'Resize City' }), {
			button: 0,
			clientX: 100,
		})

		await act(frames)

		vi.mocked(useGridPinnedOffsets).mockClear()

		await dragFrames()

		// A new frozen layout on each frame keeps the host at one render.
		expect(hostRenders()).toBe(5)

		held.release({ clientX: 150 })
	})
})
