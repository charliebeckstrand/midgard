import { afterEach, beforeEach, describe, expect, it } from 'vitest'
import { userEvent } from 'vitest/browser'
import { useIsRtl } from '../../hooks/use-is-rtl'
import { useTruncation } from '../../hooks/use-truncation'
import { act, renderUI, screen, waitFor } from '../helpers'

/** The observers that watch `dir`, and the ones of them that still observe. */
type DirObservers = { made: number; live: Set<MutationObserver> }

/**
 * Counts each `MutationObserver` that observes the `dir` attribute. The count
 * is the measure of the shared observer: one for the page, not one for each
 * reader.
 */
function watchDirObservers(): { observers: DirObservers; restore: () => void } {
	const observers: DirObservers = { made: 0, live: new Set() }

	const { observe, disconnect } = MutationObserver.prototype

	MutationObserver.prototype.observe = function (target, options) {
		if (options?.attributeFilter?.includes('dir')) {
			observers.made += 1

			observers.live.add(this)
		}

		observe.call(this, target, options)
	}

	MutationObserver.prototype.disconnect = function () {
		observers.live.delete(this)

		disconnect.call(this)
	}

	return {
		observers,
		restore: () => {
			MutationObserver.prototype.observe = observe

			MutationObserver.prototype.disconnect = disconnect
		},
	}
}

function Reader({ id }: { id: number }) {
	return <span data-testid={`reader-${id}`}>{useIsRtl() ? 'rtl' : 'ltr'}</span>
}

const READERS = [1, 2, 3, 4, 5]

/** Five readers of the direction, as on a page with several RTL-aware parts. */
function Readers() {
	return READERS.map((id) => <Reader key={id} id={id} />)
}

describe('the shared direction observer (real browser)', () => {
	let watched: ReturnType<typeof watchDirObservers>

	beforeEach(() => {
		watched = watchDirObservers()
	})

	afterEach(() => {
		watched.restore()

		document.documentElement.removeAttribute('dir')
	})

	it('observes the document once for every reader', () => {
		renderUI(<Readers />)

		expect(watched.observers.made).toBe(1)
	})

	it('updates every reader when the root direction changes', async () => {
		renderUI(<Readers />)

		act(() => document.documentElement.setAttribute('dir', 'rtl'))

		await waitFor(() => {
			for (const id of READERS) expect(screen.getByTestId(`reader-${id}`).textContent).toBe('rtl')
		})
	})

	it('disconnects when the last reader unmounts', () => {
		const { unmount } = renderUI(<Readers />)

		expect(watched.observers.live.size).toBe(1)

		unmount()

		expect(watched.observers.live.size).toBe(0)
	})
})

function Label({ text }: { text: string }) {
	const [ref, truncated] = useTruncation<HTMLSpanElement>()

	return (
		<div data-testid="box" style={{ width: 400 }}>
			<span ref={ref} className="block truncate" data-truncated={truncated}>
				{text}
			</span>
		</div>
	)
}

describe('the truncation observer (real browser)', () => {
	it('re-measures an armed label when its box narrows with no render', async () => {
		renderUI(<Label text="A label that fits a wide box" />)

		const box = screen.getByTestId('box')

		const label = box.firstElementChild as HTMLElement

		await userEvent.hover(label)

		expect(label.dataset.truncated).toBe('false')

		// A width change outside React reaches the label only through the observer.
		box.style.width = '40px'

		await waitFor(() => expect(label.dataset.truncated).toBe('true'))
	})
})
