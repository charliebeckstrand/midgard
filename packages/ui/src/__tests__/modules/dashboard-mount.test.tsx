import { act } from '@testing-library/react'
import type { ReactElement } from 'react'
import { hydrateRoot, type Root } from 'react-dom/client'
import { renderToString } from 'react-dom/server'
import { afterEach, beforeEach, describe, expect, it, onTestFinished, vi } from 'vitest'
import {
	Dashboard,
	type DashboardLayoutItem,
	DashboardTile,
	useDashboardRows,
} from '../../modules/dashboard'
import type { Mount } from '../../primitives/mount'
import { attach, getSlot, renderUI, screen } from '../helpers'

/**
 * A controllable `IntersectionObserver`: nothing intersects until a test says
 * so. The shared jsdom stub reports each target as visible on observe, and this
 * suite must state the deferral itself.
 */
let report: ((isIntersecting: boolean) => void) | undefined

/** The number of targets that an observer watched. */
let observed = 0

const original = window.IntersectionObserver

beforeEach(() => {
	const targets: { target: Element; callback: IntersectionObserverCallback }[] = []

	observed = 0

	class ControlledObserver {
		private readonly callback: IntersectionObserverCallback

		constructor(callback: IntersectionObserverCallback) {
			this.callback = callback
		}

		observe(target: Element) {
			observed += 1

			targets.push({ target, callback: this.callback })
		}

		unobserve() {}
		disconnect() {}
		takeRecords() {
			return []
		}
	}

	window.IntersectionObserver = ControlledObserver as unknown as typeof IntersectionObserver

	report = (isIntersecting) => {
		act(() => {
			for (const { target, callback } of targets) {
				callback(
					[{ target, isIntersecting } as IntersectionObserverEntry],
					{} as IntersectionObserver,
				)
			}
		})
	}
})

afterEach(() => {
	window.IntersectionObserver = original

	report = undefined
})

/**
 * The server markup of `element`. A server has no `IntersectionObserver`, and
 * `useInView` reports each target as visible there, so the markup renders with
 * none.
 */
function serverMarkup(element: ReactElement): string {
	const observer = window.IntersectionObserver

	Reflect.deleteProperty(window, 'IntersectionObserver')

	try {
		return renderToString(element)
	} finally {
		window.IntersectionObserver = observer
	}
}

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

		expect(observed).toBe(0)
	})

	it('holds the content under lazy until the tile comes near the viewport, and keeps it', () => {
		const { container } = renderUI(<Board mount="lazy" />)

		expect(screen.queryByText('Drawn')).not.toBeInTheDocument()

		expect(screen.getByText('Waiting')).toBeInTheDocument()

		expect(getSlot(container, 'dashboard-tile-content')).toHaveAttribute('data-deferred')

		report?.(true)

		expect(screen.getByText('Drawn')).toBeInTheDocument()

		expect(getSlot(container, 'dashboard-tile-content')).not.toHaveAttribute('data-deferred')

		report?.(false)

		expect(screen.getByText('Drawn')).toBeInTheDocument()
	})

	it('unmounts the content under active when the tile leaves the viewport', () => {
		renderUI(<Board mount="active" />)

		report?.(true)

		expect(screen.getByText('Drawn')).toBeInTheDocument()

		report?.(false)

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

		report?.(true)

		expect(container).toHaveTextContent('Drawn')
	})
})
