import { act } from '@testing-library/react'
import { afterEach, beforeEach, describe, expect, it } from 'vitest'
import { useInView } from '../../hooks/use-in-view'
import { renderUI, screen } from '../helpers'

/** Each observer the hook builds: its options, its callback, and whether it is still connected. */
type Observed = {
	options: IntersectionObserverInit | undefined
	callback: IntersectionObserverCallback
	connected: boolean
}

let observers: Observed[] = []

const original = window.IntersectionObserver

beforeEach(() => {
	observers = []

	class ControlledObserver {
		private readonly record: Observed

		constructor(callback: IntersectionObserverCallback, options?: IntersectionObserverInit) {
			this.record = { options, callback, connected: true }

			observers.push(this.record)
		}

		observe() {}
		unobserve() {}
		disconnect() {
			this.record.connected = false
		}
		takeRecords() {
			return []
		}
	}

	window.IntersectionObserver = ControlledObserver as unknown as typeof IntersectionObserver
})

afterEach(() => {
	window.IntersectionObserver = original
})

/** Sends one entry to the newest observer, as a scroll would. */
function report(isIntersecting: boolean) {
	const current = observers.at(-1)

	if (!current) throw new Error('no observer')

	act(() => {
		current.callback([{ isIntersecting } as IntersectionObserverEntry], {} as IntersectionObserver)
	})
}

function Probe(props: { once?: boolean; margin?: string }) {
	const { ref, inView } = useInView(props)

	return <div ref={ref} data-testid="probe" data-in-view={String(inView)} />
}

const state = () => screen.getByTestId('probe').getAttribute('data-in-view')

describe('useInView', () => {
	it('reports in view where no IntersectionObserver exists', () => {
		// @ts-expect-error — the environment without an observer.
		window.IntersectionObserver = undefined

		renderUI(<Probe />)

		expect(state()).toBe('true')
	})

	it('passes the margin to the observer as its rootMargin', () => {
		renderUI(<Probe margin="50px" />)

		expect(observers.at(-1)?.options?.rootMargin).toBe('50px')
	})

	it('latches on first sight and disconnects by default', () => {
		renderUI(<Probe />)

		expect(state()).toBe('false')

		report(false)

		expect(state()).toBe('false')

		report(true)

		expect(state()).toBe('true')

		expect(observers.at(-1)?.connected).toBe(false)

		report(false)

		expect(state()).toBe('true')
	})

	it('tracks the element in and out of view with once false', () => {
		renderUI(<Probe once={false} />)

		report(true)

		expect(state()).toBe('true')

		report(false)

		expect(state()).toBe('false')

		expect(observers.at(-1)?.connected).toBe(true)
	})

	it('rebuilds the observer when once changes', () => {
		const { rerender } = renderUI(<Probe once />)

		const first = observers.at(-1)

		rerender(<Probe once={false} />)

		expect(first?.connected).toBe(false)

		expect(observers.at(-1)).not.toBe(first)

		expect(observers.at(-1)?.connected).toBe(true)
	})
})
