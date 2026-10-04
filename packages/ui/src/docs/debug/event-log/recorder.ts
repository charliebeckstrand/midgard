import { subscribeOverlaySignal } from 'ui/primitives/overlay'

/** The kind of an {@link Entry}, which the sheet filters by. */
export type Kind =
	| 'load'
	| 'paint'
	| 'route'
	| 'input'
	| 'scroll'
	| 'viewport'
	| 'call'
	| 'overlay'
	| 'error'
	| 'hmr'

/** One line of the log. */
export type Entry = {
	/** Milliseconds from the start of the navigation of its page load (`performance.now()`). */
	time: number
	kind: Kind
	text: string
	/** The scroll position of the page. */
	y: number
}

/** The `sessionStorage` subset that the log uses. A test gives a fake. */
export type Store = Pick<Storage, 'getItem' | 'setItem' | 'removeItem'>

/** The most entries that the log keeps. The oldest goes first. */
export const CAPACITY = 500

/** The `sessionStorage` key of the kept entries. */
const ENTRIES = 'docs:event-log:entries'

/** The `sessionStorage` key of the "Preserve log" flag. */
const PRESERVE = 'docs:event-log:preserve'

/** The attribute of the button and the sheet of the log. The log skips the events in them. */
export const OWN = 'data-event-log'

/**
 * The log of one tab: the entries in memory, kept in `sessionStorage` while
 * "Preserve log" is on. A new log reads the kept entries, so a reload starts
 * from them.
 */
export class EventLog {
	entries: readonly Entry[] = []

	private readonly listeners = new Set<() => void>()

	private saveTimer: ReturnType<typeof setTimeout> | undefined

	private readonly store: Store

	constructor(store: Store) {
		this.store = store

		if (this.preserve) this.entries = parse(read(store, ENTRIES)).slice(-CAPACITY)
	}

	get preserve(): boolean {
		return read(this.store, PRESERVE) === '1'
	}

	/** Turns "Preserve log" on or off. Off deletes the kept entries at once, and the entries on screen stay. */
	set preserve(on: boolean) {
		write(this.store, PRESERVE, on ? '1' : null)

		if (on) this.save()
		else write(this.store, ENTRIES, null)

		this.emit()
	}

	/** Adds an entry in time order among the entries of the current page load. */
	add(entry: Entry): void {
		const next = [...this.entries]

		let index = next.length

		while (index > 0) {
			const previous = next[index - 1]

			if (!previous || previous.kind === 'load' || previous.time <= entry.time) break

			index -= 1
		}

		next.splice(index, 0, entry)

		this.entries = next.slice(-CAPACITY)

		this.scheduleSave()

		this.emit()
	}

	clear(): void {
		this.entries = []

		this.save()

		this.emit()
	}

	/** Writes the entries to `sessionStorage` while "Preserve log" is on. */
	save(): void {
		clearTimeout(this.saveTimer)

		if (this.preserve) write(this.store, ENTRIES, JSON.stringify(this.entries))
	}

	subscribe = (listener: () => void): (() => void) => {
		this.listeners.add(listener)

		return () => this.listeners.delete(listener)
	}

	private scheduleSave(): void {
		clearTimeout(this.saveTimer)

		this.saveTimer = setTimeout(() => this.save(), 500)
	}

	private emit(): void {
		for (const listener of this.listeners) listener()
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

function parse(json: string | null): Entry[] {
	try {
		const value: unknown = JSON.parse(json ?? '[]')

		return Array.isArray(value) ? value : []
	} catch {
		return []
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
export let log: EventLog | undefined

let stop: (() => void) | undefined

/**
 * Starts the log of this tab, and returns it. The first start of a page load
 * writes the load lines and takes the readings of the head script. A call
 * while the log runs returns the same log.
 */
export function start(): EventLog {
	if (log && stop) return log

	if (!log) {
		log = new EventLog(sessionStorage)

		begin(log)
	}

	stop = listen(log)

	return log
}

/** Stops the listeners of the log. The entries stay. */
export function halt(): void {
	stop?.()

	stop = undefined
}

/** Adds an entry with the time and the scroll position of now. */
export function record(kind: Kind, text: string, time = performance.now()): void {
	log?.add({ time: Math.round(time), kind, text, y: Math.round(window.scrollY) })
}

/** Whether an event target is in the button or the sheet of the log. */
function isOwn(target: unknown): boolean {
	return target instanceof Element && target.closest(`[${OWN}]`) !== null
}

/** A short name of an event target: the tag, the anchor, and the value of an input. */
function describe(target: unknown): string {
	if (target === document || target === window || target === document.documentElement) return 'page'

	if (!(target instanceof Element)) return String(target)

	const slot = target.getAttribute('data-slot')

	const value = target instanceof HTMLInputElement && target.value ? `=${target.value}` : ''

	return `${target.tagName.toLowerCase()}${slot ? `[${slot}]` : ''}${value}`
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

/** The heights that place a surface fixed to an edge: the visual viewport, the window, the viewport units, and the safe area. */
function viewport(probe: HTMLElement): string {
	const visual = window.visualViewport

	const [svh, dvh, lvh, safe] = Array.from(probe.children, (child) => getComputedStyle(child))

	const units = [svh, dvh, lvh]
		.map((style) => Math.round(Number.parseFloat(style?.height ?? '')))
		.join('/')

	return `visual ${Math.round(visual?.height ?? 0)}@${Math.round(visual?.offsetTop ?? 0)} window ${window.innerHeight} s/d/lvh ${units} safe ${safe?.paddingTop}/${safe?.paddingBottom}`
}

/** The first two frames of the caller of a patched method, with each URL cut to its file name. */
function caller(): string {
	return (new Error().stack ?? '')
		.split('\n')
		.map((frame) => frame.trim().replace(/https?:\/\/[^\s)]*\//g, ''))
		.filter((frame) => frame && frame !== 'Error' && !frame.includes('recorder'))
		.slice(0, 2)
		.join(' < ')
}

/** The kept scroll position of `<ScrollRestoration>` for this history entry. */
function keptScroll(): string {
	try {
		const key = (history.state as { key?: string } | null)?.key ?? 'default'

		const positions: unknown = JSON.parse(
			sessionStorage.getItem('react-router-scroll-positions') ?? '{}',
		)

		return String((positions as Record<string, unknown>)[key] ?? '-')
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
function begin(target: EventLog): void {
	const [navigation] = performance.getEntriesByType('navigation') as PerformanceNavigationTiming[]

	target.add({
		time: 0,
		kind: 'load',
		text: `──── ${navigation?.type ?? 'load'} ${location.pathname}`,
		y: 0,
	})

	const probe = document.body.appendChild(createProbe())

	record('load', `restore ${history.scrollRestoration} kept y ${keptScroll()} ${viewport(probe)}`)

	probe.remove()

	window.__eventLog?.stop()

	for (const entry of window.__eventLog?.entries ?? []) target.add(entry)

	delete window.__eventLog
}

/** Adds the listeners and the patches of the log, and returns a function that removes them. */
function listen(target: EventLog): () => void {
	const probe = document.body.appendChild(createProbe())

	const cleanups: (() => void)[] = []

	const on = (where: EventTarget | undefined, type: string, listener: (event: Event) => void) => {
		const options = { capture: true, passive: true }

		where?.addEventListener(type, listener, options)

		cleanups.push(() => where?.removeEventListener(type, listener, options))
	}

	for (const type of INPUT) {
		on(document, type, (event) => {
			if (isOwn(event.target)) return

			record('input', `${type} ${describe(event.target)}${event.isTrusted ? '' : ' synthetic'}`)

			// The listeners of the target run after this capture listener.
			setTimeout(() => event.defaultPrevented && record('input', `${type} cancelled`))
		})
	}

	let scrolling: ReturnType<typeof setTimeout> | undefined

	on(document, 'scroll', (event) => {
		if (isOwn(event.target)) return

		if (!scrolling) record('scroll', `scroll starts ${describe(event.target)}`)

		clearTimeout(scrolling)

		scrolling = setTimeout(() => {
			scrolling = undefined

			record('scroll', 'scroll ends')
		}, 150)
	})

	on(window, 'resize', () => record('viewport', `window resize ${viewport(probe)}`))

	on(window.visualViewport ?? undefined, 'resize', () =>
		record('viewport', `visual resize ${viewport(probe)}`),
	)

	on(window, 'error', (event) => record('error', (event as ErrorEvent).message))

	on(window, 'unhandledrejection', (event) =>
		record('error', `unhandled rejection ${String((event as PromiseRejectionEvent).reason)}`),
	)

	on(window, 'pagehide', () => target.save())

	cleanups.push(subscribeOverlaySignal(() => record('overlay', `overlay opens ${viewport(probe)}`)))

	let height = 0

	const heights = new ResizeObserver(() => {
		if (document.documentElement.scrollHeight === height) return

		height = document.documentElement.scrollHeight

		record('viewport', `page height ${height}`)
	})

	heights.observe(document.documentElement)

	cleanups.push(() => heights.disconnect())

	// Paint entries arrive late, but with their own times, so the log puts each in its place.
	const paints = new PerformanceObserver((list) => {
		for (const paint of list.getEntries()) {
			const shift = paint as PerformanceEntry & { value?: number; hadRecentInput?: boolean }

			const detail = paint.entryType === 'layout-shift' ? ` ${shift.value?.toFixed(4)}` : ''

			if (!shift.hadRecentInput)
				record('paint', `${paint.name || paint.entryType}${detail}`, paint.startTime)
		}
	})

	for (const type of ['paint', 'largest-contentful-paint', 'layout-shift']) {
		if (PerformanceObserver.supportedEntryTypes.includes(type))
			paints.observe({ type, buffered: true })
	}

	cleanups.push(() => paints.disconnect())

	// The one patch of the log: each script call that scrolls or moves the focus, with its caller.
	for (const [owner, name] of CALLS) {
		const original: unknown = Reflect.get(owner, name)

		if (typeof original !== 'function') continue

		Reflect.set(owner, name, function (this: unknown, ...args: unknown[]) {
			if (!isOwn(this))
				record('call', `${name} ${describe(this)} ${JSON.stringify(args)} from ${caller()}`)

			return Reflect.apply(original, this, args)
		})

		cleanups.push(() => Reflect.set(owner, name, original))
	}

	return () => {
		for (const cleanup of cleanups) cleanup()

		clearTimeout(scrolling)

		probe.remove()

		target.save()
	}
}

// In dev, the log records each hot update, and an edit to this module keeps
// the entries: the old module gives them to the new one.
if (import.meta.hot) {
	const kept: { entries?: readonly Entry[]; running?: boolean } = import.meta.hot.data

	if (kept.entries) {
		log = new EventLog(sessionStorage)

		log.entries = kept.entries

		if (kept.running) start()
	}

	import.meta.hot.on('vite:afterUpdate', ({ updates }) =>
		record('hmr', `update ${updates.map((update) => update.path).join(' ')}`),
	)

	import.meta.hot.on('vite:error', ({ err }) => record('hmr', `error ${err.message}`))

	import.meta.hot.dispose((data: { entries?: readonly Entry[]; running?: boolean }) => {
		data.entries = log?.entries

		data.running = stop !== undefined

		halt()
	})
}
