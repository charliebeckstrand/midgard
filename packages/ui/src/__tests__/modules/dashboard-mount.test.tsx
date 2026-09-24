import { act } from '@testing-library/react'
import type { ReactElement } from 'react'
import { hydrateRoot, type Root } from 'react-dom/client'
import { renderToString } from 'react-dom/server'
import { afterEach, beforeEach, describe, expect, it, onTestFinished, vi } from 'vitest'
import { Dashboard, type DashboardLayoutItem, DashboardTile } from '../../modules/dashboard'
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

	it('renders the fallback of a held tile on the server, and the content of an always tile', () => {
		expect(serverMarkup(<Board mount="lazy" />)).toContain('Waiting')

		expect(serverMarkup(<Board mount="lazy" />)).not.toContain('Drawn')

		expect(serverMarkup(<Board />)).toContain('Drawn')
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
