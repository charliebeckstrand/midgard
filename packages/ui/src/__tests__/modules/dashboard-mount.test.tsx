import { act } from '@testing-library/react'
import type { ReactElement } from 'react'
import { hydrateRoot, type Root } from 'react-dom/client'
import { beforeEach, describe, expect, it, onTestFinished, vi } from 'vitest'
import {
	Dashboard,
	type DashboardLayoutItem,
	DashboardTile,
	useDashboardRows,
} from '../../modules/dashboard'
import type { Mount } from '../../primitives/mount'
import { attach, getSlot, renderUI, screen } from '../helpers'
import {
	type ControlledObserver,
	installControlledObserver,
	serverMarkup,
} from '../helpers/controlled-intersection'

let observer: ControlledObserver

beforeEach(() => {
	observer = installControlledObserver()
})

const LAYOUT: DashboardLayoutItem[] = [{ id: 'a', x: 0, y: 0, w: 12 }]

function Board({ mount }: { mount?: Mount }) {
	return (
		<Dashboard aria-label="Sales" layout={{ defaultValue: LAYOUT }}>
			<DashboardTile id="a" title="Revenue" ratio={16 / 9} mount={mount} fallback={<p>Waiting</p>}>
				<p>Drawn</p>
			</DashboardTile>
		</Dashboard>
	)
}

describe('DashboardTile mount', () => {
	it('renders the content at once under always, with no observer', () => {
		renderUI(<Board />)

		expect(screen.getByText('Drawn')).toBeInTheDocument()

		expect(observer.observed()).toBe(0)
	})

	it('holds the content under lazy until the tile comes near the viewport, and keeps it', () => {
		const { container } = renderUI(<Board mount="lazy" />)

		expect(screen.queryByText('Drawn')).not.toBeInTheDocument()

		expect(screen.getByText('Waiting')).toBeInTheDocument()

		expect(getSlot(container, 'dashboard-tile-content')).toHaveAttribute('data-deferred')

		observer.report(true)

		expect(screen.getByText('Drawn')).toBeInTheDocument()

		expect(getSlot(container, 'dashboard-tile-content')).not.toHaveAttribute('data-deferred')

		observer.report(false)

		expect(screen.getByText('Drawn')).toBeInTheDocument()
	})

	it('unmounts the content under active when the tile leaves the viewport', () => {
		renderUI(<Board mount="active" />)

		observer.report(true)

		expect(screen.getByText('Drawn')).toBeInTheDocument()

		observer.report(false)

		expect(screen.queryByText('Drawn')).not.toBeInTheDocument()

		expect(screen.getByText('Waiting')).toBeInTheDocument()
	})

	it.each(['lazy', 'active'] as const)(
		'renders the fallback of a %s tile on the server',
		(mount) => {
			const html = serverMarkup(<Board mount={mount} />)

			expect(html).toContain('Waiting')

			expect(html).not.toContain('Drawn')
		},
	)

	it('renders the content of an always tile on the server', () => {
		expect(serverMarkup(<Board />)).toContain('Drawn')
	})

	it('hydrates a board with a saved selection and a tile with no entry, with no mismatch', () => {
		const sales = [
			{ region: 'North', amount: 10 },
			{ region: 'West', amount: 30 },
		]

		function Total() {
			const rows = useDashboardRows(sales)

			return <output>Total {rows.reduce((sum, row) => sum + row.amount, 0)}</output>
		}

		function Selected() {
			const rows = useDashboardRows(sales)

			return <p>Regions {rows.length}</p>
		}

		const layout: DashboardLayoutItem[] = [
			{ id: 'regions', x: 0, y: 0, w: 12, h: 10 },
			{ id: 'total', x: 12, y: 0, w: 12, h: 10 },
		]

		const selection = [{ source: 'regions', field: 'region', values: ['West'] }]

		const board = (
			<Dashboard
				aria-label="Sales"
				layout={{ defaultValue: layout }}
				selection={{ defaultValue: selection }}
			>
				<DashboardTile id="regions" title="Regions">
					<Selected />
				</DashboardTile>

				<DashboardTile id="total" title="Total">
					<Total />
				</DashboardTile>

				<DashboardTile id="notes" title="Notes">
					<p>Notes</p>
				</DashboardTile>
			</Dashboard>
		)

		const container = attach(document.createElement('div'))

		container.innerHTML = serverMarkup(board)

		// The server filters the other tiles, and it draws no tile with no entry.
		expect(container).toHaveTextContent('Total 30')

		expect(container).not.toHaveTextContent('Notes')

		const onRecoverableError = vi.fn()

		let root: Root | undefined

		act(() => {
			root = hydrateRoot(container, board, { onRecoverableError })
		})

		onTestFinished(() => act(() => root?.unmount()))

		expect(onRecoverableError).not.toHaveBeenCalled()

		// The source keeps its whole list, the other tile stays filtered, and the new tile draws.
		expect(container).toHaveTextContent('Regions 2')

		expect(container).toHaveTextContent('Total 30')

		expect(container).toHaveTextContent('Notes')
	})

	it('hydrates the server markup of a held tile with no mismatch', () => {
		const container = attach(document.createElement('div'))

		container.innerHTML = serverMarkup(<Board mount="lazy" />)

		const onRecoverableError = vi.fn()

		let root: Root | undefined

		act(() => {
			root = hydrateRoot(container, <Board mount="lazy" />, { onRecoverableError })
		})

		onTestFinished(() => act(() => root?.unmount()))

		expect(onRecoverableError).not.toHaveBeenCalled()

		expect(container).toHaveTextContent('Waiting')

		observer.report(true)

		expect(container).toHaveTextContent('Drawn')
	})
})

describe('a saved selection of a tile that is not on the board', () => {
	const sales = [
		{ region: 'North', amount: 10 },
		{ region: 'West', amount: 30 },
	]

	function Total() {
		const rows = useDashboardRows(sales)

		return <output>Total {rows.reduce((sum, row) => sum + row.amount, 0)}</output>
	}

	const TOTAL: DashboardLayoutItem = { id: 'total', x: 0, y: 0, w: 12, h: 10 }

	function Board({ layout }: { layout: DashboardLayoutItem[] }) {
		return (
			<Dashboard
				aria-label="Sales"
				layout={{ defaultValue: layout }}
				selection={{ defaultValue: [{ source: 'gone', field: 'region', values: ['West'] }] }}
			>
				<DashboardTile id="total" title="Total">
					<Total />
				</DashboardTile>
			</Dashboard>
		)
	}

	/** Renders the board on the server, and hydrates that markup with an error spy. */
	function hydrate(board: ReactElement) {
		const container = attach(document.createElement('div'))

		container.innerHTML = serverMarkup(board)

		const server = container.textContent

		const onRecoverableError = vi.fn()

		let root: Root | undefined

		act(() => {
			root = hydrateRoot(container, board, { onRecoverableError })
		})

		onTestFinished(() => act(() => root?.unmount()))

		return { server, container, onRecoverableError }
	}

	it('applies no selection of a tile with no entry, on the server or after hydration', () => {
		// A remove drops the entry of the tile, so the saved layout names only the other tile.
		const { server, container, onRecoverableError } = hydrate(<Board layout={[TOTAL]} />)

		expect(server).toContain('Total 40')

		expect(onRecoverableError).not.toHaveBeenCalled()

		expect(container).toHaveTextContent('Total 40')
	})

	it('hydrates the selection of a tile whose entry outlives it, then stops applying it', () => {
		// A JSX board keeps the entry of a tile that left, so the server counts that tile as present.
		const gone: DashboardLayoutItem = { id: 'gone', x: 12, y: 0, w: 12, h: 10 }

		const { server, container, onRecoverableError } = hydrate(<Board layout={[TOTAL, gone]} />)

		expect(server).toContain('Total 30')

		// The content of the tile hydrates after the tiles register, and it still reads the server state.
		expect(onRecoverableError).not.toHaveBeenCalled()

		expect(container).toHaveTextContent('Total 40')
	})
})
