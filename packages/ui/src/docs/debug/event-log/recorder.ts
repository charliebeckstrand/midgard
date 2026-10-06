import type { JsonValue } from 'ui/json-tree'
import { subscribeOverlaySignal } from 'ui/primitives/overlay'
import { createEmitter } from '../../../utilities/emitter.ts'
import { noop } from '../../../utilities/noop.ts'
import { listenComponentEvents } from './component-events.ts'

/** The kinds of an {@link Entry}. */
export const KINDS = [
	'load',
	'paint',
	'route',
	'input',
	'scroll',
	'viewport',
	'call',
	'component',
	'module',
	'overlay',
	'error',
	'hmr',
] as const

/** The kind of an {@link Entry}. */
export type Kind = (typeof KINDS)[number]

/** One line of the log. */
export type Entry = {
	/** Milliseconds from the start of the navigation of its page load (`performance.now()`). */
	time: number
	kind: Kind
	text: string
	/** The scroll position of the page. */
	y: number
	/**
	 * The data of the entry that the line does not hold in full, such as the
	 * arguments of a callback, a stack, or the fields of a reading. The sheet
	 * shows it under the line, and Copy writes it as JSON.
	 */
	detail?: JsonValue
}

/** The `sessionStorage` subset that the log uses. A test gives a fake. */
export type Store = Pick<Storage, 'getItem' | 'setItem' | 'removeItem'>

/** The most entries that the log keeps. The oldest goes first. */
export const CAPACITY = 500

/** The `sessionStorage` key of the kept entries. */
const ENTRIES = 'docs:event-log:entries'

/** The `sessionStorage` key of the "Preserve log" flag. */
const PRESERVE = 'docs:event-log:preserve'

/** The attribute of the button of the log. The log skips the events in it. */
export const OWN = 'data-event-log'

/**
 * The log of one tab: the entries in memory, kept in `sessionStorage` while
 * "Preserve log" is on. A new log reads the kept entries, so a reload starts
 * from them.
 */
export class EventLog {
	entries: readonly Entry[] = []

	/** Whether the log skips each new entry. The sheet pauses the log while the sheet is on screen. */
	paused = false

	private readonly changes = createEmitter()

	/** Calls `listener` on each change of the entries or of "Preserve log". */
	readonly subscribe = this.changes.subscribe

	private saveTimer: ReturnType<typeof setTimeout> | undefined

	private readonly store: Store

	constructor(store: Store) {
		this.store = store

		// Only `save` writes the entries, so the kept value is an array of at
		// most `CAPACITY` entries.
		try {
			if (this.preserve) this.entries = JSON.parse(read(store, ENTRIES) ?? '[]')
		} catch {}
	}

	get preserve(): boolean {
		return read(this.store, PRESERVE) === '1'
	}

	/** Turns "Preserve log" on or off. Off deletes the kept entries at once, and the entries on screen stay. */
	set preserve(on: boolean) {
		write(this.store, PRESERVE, on ? '1' : null)

		if (on) this.save()
		else write(this.store, ENTRIES, null)

		this.changes.emit()
	}

	/**
	 * Starts the lines of a page load with a separator at time 0, after the
	 * lines of the page loads before it.
	 */
	separate(text: string): void {
		this.insert(this.entries.length, { time: 0, kind: 'load', text, y: 0 })
	}

	/**
	 * Adds an entry in time order among the entries of the current page load.
	 * The separator of the page load is at time 0, so no entry goes before it.
	 */
	add(entry: Entry): void {
		if (this.paused) return

		this.insert(this.entries.findLastIndex(({ time }) => time <= entry.time) + 1, entry)
	}

	clear(): void {
		this.entries = []

		this.save()

		this.changes.emit()
	}

	/** Writes the entries to `sessionStorage` while "Preserve log" is on. */
	save(): void {
		clearTimeout(this.saveTimer)

		if (this.preserve) write(this.store, ENTRIES, JSON.stringify(this.entries))
	}

	private insert(index: number, entry: Entry): void {
		this.entries = this.entries.toSpliced(index, 0, entry).slice(-CAPACITY)

		clearTimeout(this.saveTimer)

		this.saveTimer = setTimeout(() => this.save(), 500)

		this.changes.emit()
	}
}

// Storage access can throw, such as with site data off, and the log then
// lives for the page only.
function read(store: Store, key: string): string | null {
	try {
		return store.getItem(key)
	} catch {
		return null
	}
}

function write(store: Store, key: string, value: string | null): void {
	try {
		if (value === null) store.removeItem(key)
		else store.setItem(key, value)
	} catch {}
}

/** The `sessionStorage` of the tab, or a store that keeps nothing where the read of the property throws. */
function sessionStore(): Store {
	try {
		return sessionStorage
	} catch {
		return { getItem: () => null, setItem: noop, removeItem: noop }
	}
}

/** The readings before hydration, from the head script (`index.tsx`). */
type Buffer = { entries: Entry[]; stop: () => void }

declare global {
	interface Window {
		__eventLog?: Buffer
	}
}

/** The log of this tab. It starts with {@link start}. */
let log: EventLog | undefined

let stop: (() => void) | undefined

/**
 * Starts the log of this tab, and returns it. The first start of a page load
 * writes the load lines and takes the readings of the head script. A call
 * while the log runs returns the same log.
 */
export function start(): EventLog {
	if (!log) {
		log = new EventLog(sessionStore())

		begin(log)
	}

	stop ??= listen(log)

	return log
}

/** Stops the listeners of the log. The entries stay. */
export function halt(): void {
	stop?.()

	stop = undefined
}

/** An entry with the scroll position of now, at the time of now by default. */
function entryOf(kind: Kind, text: string, detail?: JsonValue, time = performance.now()): Entry {
	const entry: Entry = { time: Math.round(time), kind, text, y: Math.round(window.scrollY) }

	if (detail !== undefined) entry.detail = detail

	return entry
}

/** Adds an entry to the log of this tab while it runs. */
export function record(kind: Kind, text: string, detail?: JsonValue): void {
	log?.add(entryOf(kind, text, detail))
}

/** Whether an event target is in the button of the log. */
function isOwn(target: unknown): boolean {
	return target instanceof Element && target.closest(`[${OWN}]`) !== null
}

/** A short name of an event target: the tag, the anchor, and the value of an input. */
function describe(target: unknown): string {
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
	'input',
	'change',
	'submit',
] as const

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

/** The heights that place a surface fixed to an edge, in pixels: the visual viewport and its offset, the window, the viewport units, and the safe-area insets. */
type Viewport = {
	visual: { height: number; offsetTop: number }
	window: number
	svh: number
	dvh: number
	lvh: number
	safe: { top: number; bottom: number }
}

/** The heights that place a surface fixed to an edge now. */
function viewport(): Viewport {
	const visual = window.visualViewport

	const probe = document.body.appendChild(createProbe())

	// A computed style is live, so the probe stays until each value is read.
	const [svh, dvh, lvh, safe] = Array.from(probe.children, (child) => {
		const { height, paddingTop, paddingBottom } = getComputedStyle(child)

		return [height, paddingTop, paddingBottom].map((value) =>
			Math.round(Number.parseFloat(value) || 0),
		)
	})

	probe.remove()

	return {
		visual: {
			height: Math.round(visual?.height ?? 0),
			offsetTop: Math.round(visual?.offsetTop ?? 0),
		},
		window: window.innerHeight,
		svh: svh?.[0] ?? 0,
		dvh: dvh?.[0] ?? 0,
		lvh: lvh?.[0] ?? 0,
		safe: { top: safe?.[1] ?? 0, bottom: safe?.[2] ?? 0 },
	}
}

/**
 * The frames of a stack, with each URL cut to its file name. The frames of the
 * recorder and the `Error` header of a stack that the recorder makes go out.
 */
function framesOf(stack: string | undefined): string[] {
	return (stack ?? '')
		.split('\n')
		.map((frame) => frame.trim().replace(/https?:\/\/[^\s)]*\//g, ''))
		.filter((frame) => frame && frame !== 'Error' && !frame.includes('recorder'))
}

/** The detail of an error: its stack. A thrown value that is not an `Error` has none. */
function errorDetail(error: unknown): JsonValue | undefined {
	return error instanceof Error && error.stack ? { stack: framesOf(error.stack) } : undefined
}

/** The kept scroll position of `<ScrollRestoration>` for this history entry. */
function keptScroll(): string {
	try {
		const positions = JSON.parse(sessionStorage.getItem('react-router-scroll-positions') ?? '{}')

		return String(positions[history.state?.key ?? 'default'] ?? '-')
	} catch {
		return '-'
	}
}

/**
 * A box fixed to the layout viewport, with a child for each viewport unit and
 * one for the safe-area insets.
 */
function createProbe(): HTMLElement {
	const probe = document.createElement('div')

	probe.setAttribute('aria-hidden', 'true')

	probe.style.cssText = 'position:fixed;inset:0;visibility:hidden;pointer-events:none'

	for (const height of ['100svh', '100dvh', '100lvh', '0']) {
		probe.appendChild(document.createElement('div')).style.cssText =
			`position:absolute;height:${height};padding:env(safe-area-inset-top) 0 env(safe-area-inset-bottom)`
	}

	return probe
}

/** Writes the separator and the readings of a page load, and takes the readings of the head script. */
export function begin(target: EventLog): void {
	const [navigation] = performance.getEntriesByType('navigation') as PerformanceNavigationTiming[]

	target.separate(`──── ${navigation?.type ?? 'load'} ${location.pathname}`)

	target.add(
		entryOf('load', `restore ${history.scrollRestoration} kept y ${keptScroll()}`, viewport()),
	)

	window.__eventLog?.stop()

	for (const entry of window.__eventLog?.entries ?? []) target.add(entry)

	delete window.__eventLog
}

/** Adds the listeners and the patches of a log, and returns a function that removes them. */
export function listen(target: EventLog): () => void {
	const note = (kind: Kind, text: string, detail?: JsonValue, time?: number) =>
		target.add(entryOf(kind, text, detail, time))

	const cleanups: (() => void)[] = []

	const on = (where: EventTarget | undefined, type: string, listener: (event: Event) => void) => {
		const options = { capture: true, passive: true }

		where?.addEventListener(type, listener, options)

		cleanups.push(() => where?.removeEventListener(type, listener, options))
	}

	for (const type of INPUT) {
		on(document, type, (event) => {
			if (isOwn(event.target)) return

			note('input', `${type} ${describe(event.target)}${event.isTrusted ? '' : ' synthetic'}`)

			// The listeners of the target run after this capture listener.
			setTimeout(() => event.defaultPrevented && note('input', `${type} cancelled`))
		})
	}

	let scrolling: ReturnType<typeof setTimeout> | undefined

	on(document, 'scroll', (event) => {
		if (isOwn(event.target)) return

		if (!scrolling) note('scroll', `scroll starts ${describe(event.target)}`)

		clearTimeout(scrolling)

		scrolling = setTimeout(() => {
			scrolling = undefined

			note('scroll', 'scroll ends')
		}, 150)
	})

	on(window, 'resize', () => note('viewport', 'window resize', viewport()))

	on(window.visualViewport ?? undefined, 'resize', () =>
		note('viewport', 'visual resize', viewport()),
	)

	// The capture phase also gets the `error` of an element whose resource fails to load, such as a `<script>`.
	on(window, 'error', (event) => {
		if (event instanceof ErrorEvent) note('error', event.message, errorDetail(event.error))
		else note('error', `load fails ${describe(event.target)} ${resourceOf(event.target)}`)
	})

	on(window, 'unhandledrejection', (event) => {
		const { reason } = event as PromiseRejectionEvent

		note('error', `unhandled rejection ${String(reason)}`, errorDetail(reason))
	})

	on(window, 'pagehide', () => target.save())

	cleanups.push(listenComponentEvents(note))

	cleanups.push(subscribeOverlaySignal(() => note('overlay', 'overlay opens', viewport())))

	let height = 0

	const heights = new ResizeObserver(() => {
		if (document.documentElement.scrollHeight === height) return

		height = document.documentElement.scrollHeight

		note('viewport', `page height ${height}`)
	})

	heights.observe(document.documentElement)

	cleanups.push(() => heights.disconnect())

	// Paint entries arrive late, but with their own times, so the log puts each in its place.
	const paints = new PerformanceObserver((list) => {
		for (const paint of list.getEntries()) {
			const shift = paint as PerformanceEntry & { value?: number; hadRecentInput?: boolean }

			const detail = paint.entryType === 'layout-shift' ? ` ${shift.value?.toFixed(4)}` : ''

			if (!shift.hadRecentInput)
				note('paint', `${paint.name || paint.entryType}${detail}`, undefined, paint.startTime)
		}
	})

	for (const type of ['paint', 'largest-contentful-paint', 'layout-shift']) {
		if (PerformanceObserver.supportedEntryTypes.includes(type))
			paints.observe({ type, buffered: true })
	}

	cleanups.push(() => paints.disconnect())

	// The one patch of the log: each script call that scrolls or moves the focus,
	// with the first two frames of its caller. The detail holds the full stack.
	for (const [owner, name] of CALLS) {
		const original: unknown = Reflect.get(owner, name)

		if (typeof original !== 'function') continue

		Reflect.set(owner, name, function (this: unknown, ...args: unknown[]) {
			if (!isOwn(this)) {
				const stack = framesOf(new Error().stack)

				note(
					'call',
					`${name} ${describe(this)} ${JSON.stringify(args)} from ${stack.slice(0, 2).join(' < ')}`,
					{
						stack,
					},
				)
			}

			return Reflect.apply(original, this, args)
		})

		cleanups.push(() => Reflect.set(owner, name, original))
	}

	return () => {
		for (const cleanup of cleanups) cleanup()

		clearTimeout(scrolling)
	}
}

/** What the old module of the recorder gives to the new one on a hot update. */
type Kept = { entries?: readonly Entry[] }

// In dev, the log records each hot update, and an edit to this module while
// the log runs keeps the entries: the old module gives them to the new one.
// The `import.meta.hot` of Vitest has no `data`.
if (import.meta.hot) {
	const kept: Kept = import.meta.hot.data ?? {}

	if (kept.entries) {
		log = new EventLog(sessionStore())

		log.entries = kept.entries

		start()
	}

	import.meta.hot.on('vite:afterUpdate', ({ updates }) =>
		record('hmr', `update ${updates.map((update) => update.path).join(' ')}`),
	)

	import.meta.hot.on('vite:error', ({ err }) => record('hmr', `error ${err.message}`))

	import.meta.hot.dispose((data: Kept) => {
		data.entries = stop ? log?.entries : undefined

		halt()
	})
}
