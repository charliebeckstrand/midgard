/**
 * What the events cost an app on its input path, and what the pinned panel
 * costs for each frame that it renders.
 *
 * The first scenario dispatches the input events of one tap on a button:
 * `pointerdown`, `mousedown`, `focusin`, `pointerup`, `mouseup`, and `click`.
 * `events off` is the floor: the same dispatches with no recorder. The other
 * rows run the recorder on a full store, {@link EVENT_CAPACITY} events outside a
 * capture and {@link CAPTURE_CAPACITY} while one runs, so each line drops the
 * oldest, as in a long session. The timed region is the dispatches. The input
 * source checks each cancelled default on a timer, and that timer runs after
 * the sample.
 *
 * The second scenario adds the frame of the pinned panel: the same tap, then
 * one frame from a fake frame clock (`withFrameClock` in
 * [`harness.ts`](harness.ts)), in which the panel renders the list again. The
 * panel renders one time for each frame at most, so a frame holds the whole
 * tap. `no panel` is the tap with the recorder on and no view, and the step to
 * each panel row is the render of the panel.
 *
 * The third scenario prices the viewport source: a resize of the window on a
 * page of 5,000 boxes, with the events off and on.
 *
 * The findings are in the Events section of [`README.md`](README.md).
 */

import { bench, describe } from 'vitest'
import { halt, start } from '../../modules/events/engine/events-recorder'
import {
	CAPTURE_CAPACITY,
	EVENT_CAPACITY,
	type EventStore,
} from '../../modules/events/engine/events-store'
import { EventsPanel } from '../../modules/events/events-panel'
import { host, reactHost, WINDOW, withFrameClock } from './harness'

/** The button that each tap presses: outside the tools, with a slot, as the buttons of `ui` have. */
const button = host().appendChild(document.createElement('button'))

button.setAttribute('data-slot', 'button')

button.textContent = 'Save'

/** Dispatches the input events of one tap on the button. */
function tap() {
	const init = { bubbles: true, cancelable: true, button: 0, clientX: 10, clientY: 10 }

	button.dispatchEvent(new PointerEvent('pointerdown', { ...init, buttons: 1 }))
	button.dispatchEvent(new MouseEvent('mousedown', { ...init, buttons: 1 }))
	button.dispatchEvent(new FocusEvent('focusin', { bubbles: true }))
	button.dispatchEvent(new PointerEvent('pointerup', init))
	button.dispatchEvent(new MouseEvent('mouseup', init))
	button.dispatchEvent(new MouseEvent('click', init))
}

/** Starts the recorder on a store full to `count` lines of earlier taps. */
function fill(count: number, capture: boolean): EventStore {
	const store = start()

	if (capture) store.startCapture()

	while (store.entries.length < count) tap()

	return store
}

/** The bench options that start the recorder before each cycle and halt it after. */
function running(count: number, capture = false) {
	return {
		...WINDOW.slow,
		setup: () => {
			fill(count, capture)
		},
		teardown: () => {
			halt()
		},
	}
}

describe('events · one tap', () => {
	bench('events off', tap, WINDOW.slow)

	bench(`events on · ${EVENT_CAPACITY} events`, tap, running(EVENT_CAPACITY))

	bench(`events on · ${CAPTURE_CAPACITY} events · capture`, tap, running(CAPTURE_CAPACITY, true))
})

describe('events · one tap and the frame of the pinned panel', () => {
	bench(
		`no panel · ${EVENT_CAPACITY} events`,
		() =>
			withFrameClock((tick) => {
				tap()

				tick()
			}),
		running(EVENT_CAPACITY),
	)

	for (const [count, capture] of [
		[EVENT_CAPACITY, false],
		[CAPTURE_CAPACITY, true],
	] as const) {
		let panel: ReturnType<typeof reactHost> | undefined

		bench(
			`pinned panel · ${count} events${capture ? ' · capture' : ''}`,
			() =>
				withFrameClock((tick) => {
					tap()

					tick()
				}),
			{
				...WINDOW.slow,
				setup: () => {
					fill(count, capture)

					panel = reactHost()

					panel.render(
						<div data-events-tool="" style={{ height: 800, width: 384, display: 'flex' }}>
							<EventsPanel />
						</div>,
					)
				},
				teardown: () => {
					panel?.destroy()

					halt()
				},
			},
		)
	}
})

describe('events · one window resize on a page of 5,000 boxes', () => {
	let page: HTMLElement | undefined

	// The page holds enough boxes that a layout costs what it costs on a real
	// page. It mounts only while this scenario runs.
	const mountPage = () => {
		page = host({ width: 960 })

		for (let index = 0; index < 5_000; index++)
			page.appendChild(document.createElement('div')).textContent = `Row ${index}`
	}

	/** A resize of the window, then a read of the height of the page, as the next frame lays it out. */
	const resize = () => {
		window.dispatchEvent(new Event('resize'))

		if (!page) return

		page.style.width = page.style.width === '960px' ? '961px' : '960px'

		void page.offsetHeight
	}

	bench('events off', resize, {
		...WINDOW.slow,
		setup: mountPage,
		teardown: () => page?.remove(),
	})

	bench(`events on · ${EVENT_CAPACITY} events`, resize, {
		...WINDOW.slow,
		setup: () => {
			mountPage()

			fill(EVENT_CAPACITY, false)
		},
		teardown: () => {
			halt()

			page?.remove()
		},
	})
})
