/**
 * The listeners on the page's four global targets: `window`, `document`, the
 * root element, and the body.
 *
 * Both browser instances and the jsdom `unit` project run `isolate: false`, so
 * one page serves every file. A listener on a global target outlives the tree
 * that added it, and nothing in Testing Library's `cleanup` reaches it. The
 * browser suite's intermittent failure was one such listener: dnd-kit's
 * capture-phase `click` handler, which dropped every click in the files after
 * it. The DOM gives no way to list the listeners on a target, so this registry
 * records them as they arrive.
 *
 * It records only what arrives after {@link watchGlobalListeners} runs. The
 * runner's and the dev server's own listeners attach first and stay out of it.
 */

/** A listener on one of the page's global targets, and the code that added it. */
export type GlobalListener = {
	/** The global target the listener sits on. */
	target: 'window' | 'document' | 'html' | 'body'
	/** The event type it listens for. */
	type: string
	/** Whether it listens in the capture phase. */
	capture: boolean
	/** The top frames of the stack that added it. */
	origin: string
}

/**
 * Library wiring that attaches once per page by design and never detaches.
 * React marks each root container it listens on, and user-event marks each
 * document it prepares, so neither attaches twice or cleans up.
 */
const ONCE_PER_PAGE = ['listenToAllSupportedEvents', 'prepareDocument']

/** How many frames of the adding stack a report carries. */
const ORIGIN_FRAMES = 3

/** Each live listener, by the listener, then by its target, type and phase. */
type Registry = Map<unknown, Map<string, GlobalListener>>

/**
 * Global keys, because a setup module runs again for each file on a shared
 * page. The registry and the patch must survive that, or the second file sees
 * none of the first file's listeners.
 */
const REGISTRY = Symbol.for('ui.test.global-listeners')

const PATCHED = Symbol.for('ui.test.global-listeners.patched')

function registry(): Registry {
	const host = globalThis as { [REGISTRY]?: Registry }

	host[REGISTRY] ??= new Map()

	return host[REGISTRY]
}

function targetName(target: EventTarget): GlobalListener['target'] | null {
	if (typeof document === 'undefined') return null

	if (target === window) return 'window'

	if (target === document) return 'document'

	if (target === document.documentElement) return 'html'

	if (target === document.body) return 'body'

	return null
}

function captureOf(options?: boolean | EventListenerOptions): boolean {
	return typeof options === 'boolean' ? options : Boolean(options?.capture)
}

/** Shortens a stack frame to the function and the package-relative source. */
function tidy(frame: string): string {
	return frame
		.trim()
		.replace(/^at /, '')
		.replace(/https?:\/\/[^/]+/g, '')
		.replace(/\?[^:)]*/g, '')
		.replace(/[^\s(]*\/node_modules\/\.pnpm\/[^/]+\/node_modules\//g, '')
		.replace(/[^\s(]*\/deps\//g, '')
		.replace(/[^\s(]*\/src\//g, 'src/')
}

/**
 * Where the current `addEventListener` call came from, or null when the stack
 * is once-per-page library wiring.
 */
function origin(): string | null {
	const frames = (new Error().stack ?? '').split('\n').slice(1)

	if (frames.some((frame) => ONCE_PER_PAGE.some((name) => frame.includes(name)))) return null

	return frames
		.filter((frame) => !frame.includes('global-listeners'))
		.slice(0, ORIGIN_FRAMES)
		.map(tidy)
		.join(' <- ')
}

function forget(listener: unknown, key: string): void {
	const byKey = registry().get(listener)

	if (!byKey) return

	byKey.delete(key)

	if (byKey.size === 0) registry().delete(listener)
}

/**
 * Starts the record. Call it from a setup file, before any case runs.
 *
 * It wraps `addEventListener` and `removeEventListener` on
 * `EventTarget.prototype`, and it does that once per page however often the
 * setup runs. A `once` listener stays out of the record, because it removes
 * itself on the event it waits for and the wrapper never sees that.
 */
export function watchGlobalListeners(): void {
	const proto = EventTarget.prototype as EventTarget & { [PATCHED]?: true }

	if (proto[PATCHED]) return

	proto[PATCHED] = true

	const add = proto.addEventListener

	const remove = proto.removeEventListener

	proto.addEventListener = function addEventListener(this: EventTarget, type, listener, options) {
		add.call(this, type, listener, options)

		const target = listener ? targetName(this) : null

		if (!target) return

		const settings = typeof options === 'object' ? options : undefined

		if (settings?.once || settings?.signal?.aborted) return

		const capture = captureOf(options)

		const key = `${target}|${type}|${capture}`

		const byKey = registry().get(listener) ?? new Map<string, GlobalListener>()

		// A second add of the same listener, type and phase is a no-op in the DOM.
		if (byKey.has(key)) return

		const from = origin()

		if (from === null) return

		byKey.set(key, { target, type, capture, origin: from })

		registry().set(listener, byKey)

		settings?.signal?.addEventListener('abort', () => forget(listener, key), { once: true })
	}

	proto.removeEventListener = function removeEventListener(
		this: EventTarget,
		type,
		listener,
		options,
	) {
		remove.call(this, type, listener, options)

		const target = listener ? targetName(this) : null

		if (target) forget(listener, `${target}|${type}|${captureOf(options)}`)
	}
}

/**
 * The listeners on the global targets now.
 *
 * @returns One entry for each live listener. An entry keeps its identity for as
 * long as its listener stays, so two readings compare with `Set` membership.
 */
export function liveGlobalListeners(): Set<GlobalListener> {
	const live = new Set<GlobalListener>()

	for (const byKey of registry().values()) {
		for (const entry of byKey.values()) live.add(entry)
	}

	return live
}
