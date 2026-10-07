import type { JsonValue } from 'ui/json-tree'
import { subscribeOverlaySignal } from 'ui/primitives/overlay'
import { noop } from '../../../utilities/noop.ts'
import { listenCaughtErrors } from './caught-errors.ts'
import { listenComponentEvents } from './component-events.ts'
import { type Kind, OWN } from './log.ts'
import { errorDetail, framesOf, scrollReading, viewport } from './probes.ts'

// The sources of the Event log. Each source adds its listeners, writes its
// lines through `note`, and returns a function that removes the listeners.

/** A line that a source writes. The time is now by default. */
export type Line = {
	kind: Kind
	text: string
	detail?: JsonValue
	/** The time of the line, in milliseconds from the start of the navigation. */
	time?: number
	/** The name that the kind column shows in place of the kind. */
	name?: string
	/** The batch of the line: the id of the browser operation that the line is a part of. */
	batch?: string
}

/** Writes a line to the log. */
export type Note = (line: Line) => void

/** One source of lines: it adds its listeners, and returns a function that removes them. */
export type Source = (note: Note) => () => void

// The ids of the batches. An id starts with the time origin of the page load,
// so the ids of two page loads in a kept log are not the same.
let lastBatch = 0

/** A new batch id. */
function nextBatch(): string {
	return `${Math.round(performance.timeOrigin)}.${++lastBatch}`
}

/** The time with no new event that ends a scroll or a burst, in milliseconds. */
const QUIET = 150

/**
 * The batches of the bursts of a source. A line takes the batch of its key
 * while the lines of that key come less than {@link QUIET} apart.
 */
function bursts(): { batchOf: (key: string) => string; stop: () => void } {
	const open = new Map<string, { id: string; timer: ReturnType<typeof setTimeout> }>()

	return {
		batchOf(key) {
			const burst = open.get(key)

			clearTimeout(burst?.timer)

			const id = burst?.id ?? nextBatch()

			open.set(key, { id, timer: setTimeout(() => open.delete(key), QUIET) })

			return id
		},
		stop() {
			for (const { timer } of open.values()) clearTimeout(timer)

			open.clear()
		},
	}
}

/** Whether an event target is in the button of the log. */
function isOwn(target: unknown): boolean {
	return target instanceof Element && target.closest(`[${OWN}]`) !== null
}

/** A short name of an event target: the tag, the anchor, and the value of an input. */
export function describe(target: unknown): string {
	if (!(target instanceof Element) || target === document.documentElement) return 'page'

	const slot = target.getAttribute('data-slot')

	const value = target instanceof HTMLInputElement && target.value ? `=${target.value}` : ''

	return `${target.tagName.toLowerCase()}${slot ? `[${slot}]` : ''}${value}`
}

/** The URL that an element loads, as its `src` or `href` attribute gives it. */
function resourceOf(target: unknown): string {
	if (!(target instanceof Element)) return ''

	return target.getAttribute('src') ?? target.getAttribute('href') ?? ''
}

/** Adds a passive capture listener for each type, and returns a function that removes them. */
function on(
	where: EventTarget | null | undefined,
	types: readonly string[],
	listener: (event: Event) => void,
): () => void {
	const options = { capture: true, passive: true }

	for (const type of types) where?.addEventListener(type, listener, options)

	return () => {
		for (const type of types) where?.removeEventListener(type, listener, options)
	}
}

/** One function that calls each of `stops`. */
function all(stops: readonly (() => void)[]): () => void {
	return () => {
		for (const stop of stops) stop()
	}
}

// The entry types that an observer of the log took from the buffer of the
// page. A log that starts again on the same page takes the new entries only,
// so it does not write the old entries twice.
const replayed = new Set<string>()

/**
 * Observes the performance entries of each type that the browser supports, and
 * returns a function that stops. An entry arrives late, but with its own time,
 * so the log puts its line in its place.
 */
function observe(
	types: readonly string[],
	callback: (entry: PerformanceEntry) => void,
): () => void {
	const observer = new PerformanceObserver((list) => {
		for (const entry of list.getEntries()) callback(entry)
	})

	for (const type of types) {
		if (!PerformanceObserver.supportedEntryTypes.includes(type)) continue

		observer.observe({ type, buffered: !replayed.has(type) })

		replayed.add(type)
	}

	return () => observer.disconnect()
}

const INPUT = [
	'touchstart',
	'touchend',
	'touchcancel',
	'pointerdown',
	'pointerup',
	'pointercancel',
	'mousedown',
	'mouseup',
	'click',
	'focusin',
	'keydown',
	'input',
	'change',
	'submit',
]

/** The modifier keys, by the flag of a keyboard event that holds each. */
const MODIFIERS = [
	['ctrlKey', 'Control'],
	['altKey', 'Alt'],
	['shiftKey', 'Shift'],
	['metaKey', 'Meta'],
] as const

/** A key and its modifiers, such as `Shift+Tab`. A modifier that is the key itself goes out of the modifiers. */
function chord(event: KeyboardEvent): string {
	const key = event.key === ' ' ? 'Space' : event.key

	const modifiers = MODIFIERS.filter(([flag, name]) => event[flag] && name !== event.key)

	return [...modifiers.map(([, name]) => name), key].join('+')
}

/** The events that start a gesture: a press of a pointer or of a key. */
const GESTURE_STARTS = new Set(['pointerdown', 'keydown'])

/** The events that end a gesture. A gesture with no end ends at the next start. */
const GESTURE_ENDS = new Set(['click', 'pointercancel'])

/**
 * The input events, the keys with their modifiers, and each default that a
 * script cancels. The events of one gesture, from its start to its end, are
 * one batch, such as the eight events of a tap from `pointerdown` to `click`.
 */
const input: Source = (note) => {
	let gesture: string | undefined

	return on(document, INPUT, (event) => {
		if (isOwn(event.target)) return

		if (GESTURE_STARTS.has(event.type)) gesture = nextBatch()

		const batch = gesture

		if (GESTURE_ENDS.has(event.type)) gesture = undefined

		const keys = event instanceof KeyboardEvent

		note({
			kind: 'input',
			text: `${event.type}${keys ? ` ${chord(event)}` : ''} ${describe(event.target)}${event.isTrusted ? '' : ' synthetic'}`,
			detail: keys ? { key: event.key, code: event.code, repeat: event.repeat } : undefined,
			batch,
		})

		// The listeners of the target run after this capture listener.
		setTimeout(
			() =>
				event.defaultPrevented && note({ kind: 'input', text: `${event.type} cancelled`, batch }),
		)
	})
}

/** The start and the end of each scroll, as one batch. */
const scroll: Source = (note) => {
	let scrolling: ReturnType<typeof setTimeout> | undefined

	let batch = ''

	const stop = on(document, ['scroll'], (event) => {
		if (isOwn(event.target)) return

		if (!scrolling) {
			batch = nextBatch()

			note({ kind: 'scroll', text: `scroll starts ${describe(event.target)}`, batch })
		}

		clearTimeout(scrolling)

		scrolling = setTimeout(() => {
			scrolling = undefined

			note({ kind: 'scroll', text: 'scroll ends', batch })
		}, QUIET)
	})

	return () => {
		stop()

		clearTimeout(scrolling)
	}
}

/**
 * Each resize of the window and of the visual viewport, with the reading of
 * the viewport. A burst of resizes is one batch.
 */
const resize: Source = (note) => {
	const { batchOf, stop } = bursts()

	const stops = [
		on(window, ['resize'], () =>
			note({
				kind: 'viewport',
				text: 'window resize',
				detail: viewport(),
				batch: batchOf('resize'),
			}),
		),
		on(window.visualViewport, ['resize'], () =>
			note({
				kind: 'viewport',
				text: 'visual resize',
				detail: viewport(),
				batch: batchOf('resize'),
			}),
		),
		stop,
	]

	return all(stops)
}

/** Each change of the height of the page. */
const height: Source = (note) => {
	let last = 0

	const observer = new ResizeObserver(() => {
		if (document.documentElement.scrollHeight === last) return

		last = document.documentElement.scrollHeight

		note({ kind: 'viewport', text: `page height ${last}` })
	})

	observer.observe(document.documentElement)

	return () => observer.disconnect()
}

/** The errors that reach `window`, the resources that fail to load, and the unhandled rejections. */
const errors: Source = (note) => {
	const stops = [
		// The capture phase also gets the `error` of an element whose resource fails to load, such as a `<script>`.
		on(window, ['error'], (event) => {
			if (event instanceof ErrorEvent)
				note({ kind: 'error', text: event.message, detail: errorDetail(event.error) })
			else
				note({
					kind: 'error',
					text: `load fails ${describe(event.target)} ${resourceOf(event.target)}`,
				})
		}),
		on(window, ['unhandledrejection'], (event) => {
			const { reason } = event as PromiseRejectionEvent

			note({
				kind: 'error',
				text: `unhandled rejection ${String(reason)}`,
				detail: errorDetail(reason),
			})
		}),
	]

	return all(stops)
}

/**
 * The errors that an error boundary catches, with the first frame of the
 * component stack. The detail holds the stack and the component stack.
 */
const caught: Source = (note) =>
	listenCaughtErrors((error, componentStack) => {
		const components = framesOf(componentStack)

		const message = error instanceof Error ? error.message : String(error)

		note({
			kind: 'error',
			text: `caught ${message}${components[0] ? ` ${components[0]}` : ''}`,
			detail: {
				stack: error instanceof Error ? framesOf(error.stack) : [],
				componentStack: components,
			},
		})
	})

/**
 * The page lifecycle: each show, hide, and change of the visibility. A
 * restore from the back-forward cache keeps the log, so it writes a separator
 * and the readings, as the start of a page load does.
 */
const lifecycle: Source = (note) => {
	const stops = [
		on(window, ['pageshow', 'pagehide'], (event) => {
			const { persisted } = event as PageTransitionEvent

			if (event.type === 'pageshow' && persisted) {
				note({ kind: 'load', text: `──── back-forward cache ${location.pathname}` })

				note({ kind: 'load', text: scrollReading(), detail: viewport() })
			} else {
				note({ kind: 'load', text: `${event.type}${persisted ? ' persisted' : ''}` })
			}
		}),
		on(document, ['visibilitychange'], () =>
			note({ kind: 'load', text: `visibility ${document.visibilityState}` }),
		),
	]

	return all(stops)
}

/** A resource timing as JSON, with each time in whole milliseconds. */
function timingOf(entry: PerformanceResourceTiming): JsonValue {
	const fields: Record<string, unknown> = entry.toJSON()

	return Object.fromEntries(
		Object.entries(fields).map(([key, value]) => [
			key,
			typeof value === 'number' ? Math.round(value) : value,
		]),
	) as JsonValue
}

/**
 * Each script and each link that the page loads, at the start time of its
 * load: the file name, the duration, `cache` for a load from the HTTP cache,
 * and the status of a load that fails. The detail holds the resource timing.
 * The loads of one pass are one batch: a load that starts before each load of
 * the pass ends is a part of the pass.
 */
const network: Source = (note) => {
	let pass = ''

	let passEnd = Number.NEGATIVE_INFINITY

	return observe(['resource'], (entry) => {
		const resource = entry as PerformanceResourceTiming

		if (resource.initiatorType !== 'script' && resource.initiatorType !== 'link') return

		if (resource.startTime > passEnd) pass = nextBatch()

		passEnd = Math.max(passEnd, resource.responseEnd)

		// A load from the cache transfers no bytes, but has a body.
		const cache = resource.transferSize === 0 && resource.decodedBodySize > 0 ? ' cache' : ''

		// Not each browser gives the status.
		const failed = resource.responseStatus >= 400 ? ` failed ${resource.responseStatus}` : ''

		note({
			kind: 'network',
			text: `${new URL(resource.name).pathname.split('/').at(-1)} ${Math.round(resource.duration)} ms${cache}${failed}`,
			detail: timingOf(resource),
			time: resource.startTime,
			batch: pass,
		})
	})
}

/** The paints, and the layout shifts that no input causes. */
const paint: Source = (note) =>
	observe(['paint', 'largest-contentful-paint', 'layout-shift'], (entry) => {
		const shift = entry as PerformanceEntry & { value?: number; hadRecentInput?: boolean }

		const value = entry.entryType === 'layout-shift' ? ` ${shift.value?.toFixed(4)}` : ''

		if (!shift.hadRecentInput)
			note({
				kind: 'paint',
				text: `${entry.name || entry.entryType}${value}`,
				time: entry.startTime,
			})
	})

/**
 * The callbacks that a page gives to a component or to a module. A burst of
 * calls of one callback of one component is one batch.
 */
const components: Source = (note) => {
	const { batchOf, stop } = bursts()

	return all([
		listenComponentEvents(({ source, name, path, text, detail }) =>
			note({ kind: source, name, text, detail, batch: batchOf(`${name} ${path}`) }),
		),
		stop,
	])
}

/** Each overlay that opens, with the reading of the viewport. */
const overlay: Source = (note) =>
	subscribeOverlaySignal(() => note({ kind: 'overlay', text: 'overlay opens', detail: viewport() }))

const CALLS: readonly [object, string][] = [
	[window, 'scrollTo'],
	[window, 'scrollBy'],
	[window, 'scroll'],
	[Element.prototype, 'scrollTo'],
	[Element.prototype, 'scrollBy'],
	[Element.prototype, 'scroll'],
	[Element.prototype, 'scrollIntoView'],
	[HTMLElement.prototype, 'focus'],
]

/**
 * The one patch of the log: each script call that scrolls or moves the focus,
 * with the first two frames of its caller. The detail holds the full stack.
 */
const calls: Source = (note) => {
	const stops = CALLS.map(([owner, name]) => {
		const original: unknown = Reflect.get(owner, name)

		if (typeof original !== 'function') return noop

		Reflect.set(owner, name, function (this: unknown, ...args: unknown[]) {
			if (!isOwn(this)) {
				// The first frame is this function.
				const stack = framesOf(new Error().stack).slice(1)

				note({
					kind: 'call',
					text: `${name} ${describe(this)} ${JSON.stringify(args)} from ${stack.slice(0, 2).join(' < ')}`,
					detail: { stack },
				})
			}

			return Reflect.apply(original, this, args)
		})

		return () => Reflect.set(owner, name, original)
	})

	return all(stops)
}

/** The sources of the log. */
export const SOURCES: readonly Source[] = [
	input,
	scroll,
	resize,
	height,
	errors,
	caught,
	lifecycle,
	network,
	paint,
	components,
	overlay,
	calls,
]
