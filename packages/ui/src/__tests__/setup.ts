import '@testing-library/jest-dom/vitest'
import { cleanup } from '@testing-library/react'
import { afterEach, vi } from 'vitest'

afterEach(() => {
	cleanup()
})

// ── Suppress @tanstack/virtual-core teardown noise ──
// Its debounced timer fires after jsdom teardown, causing a
// "window is not defined" ReferenceError. We only swallow that
// specific error so real unhandled errors still fail the suite.
const originalOnError = window.onerror
window.onerror = (message, ...args) => {
	if (typeof message === 'string' && message.includes('window is not defined')) {
		return true
	}
	return originalOnError ? originalOnError(message, ...args) : false
}

const originalOnUnhandledRejection = window.onunhandledrejection
window.onunhandledrejection = (event: PromiseRejectionEvent) => {
	const msg = event.reason?.message ?? String(event.reason)
	if (typeof msg === 'string' && msg.includes('window is not defined')) {
		event.preventDefault()
		return
	}
	originalOnUnhandledRejection?.call(window, event)
}

// ── motion/react mock ───────────────────────────────
// Replaces animated wrappers with plain HTML elements so tests run in jsdom
// without needing a full animation runtime.

vi.mock('motion/react', async () => {
	const { createElement, forwardRef } = await import('react')

	const MOTION_PROPS = new Set([
		'animate',
		'initial',
		'exit',
		'transition',
		'variants',
		'whileTap',
		'whileHover',
		'whileFocus',
		'whileDrag',
		'whileInView',
		'layout',
		'layoutId',
		'onAnimationComplete',
		'onAnimationStart',
	])

	function stripMotionProps(props: Record<string, unknown>) {
		const clean: Record<string, unknown> = {}

		for (const [k, v] of Object.entries(props)) {
			if (!MOTION_PROPS.has(k)) clean[k] = v
		}

		return clean
	}

	const handler: ProxyHandler<object> = {
		get(_, tag: string) {
			return forwardRef((props: Record<string, unknown>, ref: unknown) =>
				createElement(tag, { ref, ...stripMotionProps(props) }),
			)
		},
	}

	const motion = new Proxy({}, handler)

	function AnimatePresence({ children }: { children: React.ReactNode }) {
		return children
	}

	function LayoutGroup({ children }: { children: React.ReactNode }) {
		return children
	}

	function useAnimate() {
		return [{ current: null }, vi.fn()]
	}

	function useMotionValue<T>(initial: T) {
		let value = initial
		return {
			get: () => value,
			set: (next: T) => {
				value = next
			},
			on: () => () => {},
		}
	}

	return { motion, AnimatePresence, LayoutGroup, useAnimate, useMotionValue }
})

// ── maplibre-gl mock ────────────────────────────────
// jsdom has no WebGL, so swap the MapLibre runtime for a minimal fake
// that records calls and fires 'load' on the next microtask.

vi.mock('maplibre-gl', () => {
	class FakeMap {
		private handlers = new Map<string, Set<(...args: unknown[]) => void>>()
		private sources = new Map<string, unknown>()
		private layers = new Map<string, unknown>()

		container: HTMLElement

		constructor(opts: { container: HTMLElement }) {
			this.container = opts.container

			queueMicrotask(() => this.emit('load'))
		}

		on(
			event: string,
			layerOrHandler: string | ((...a: unknown[]) => void),
			handler?: (...a: unknown[]) => void,
		) {
			const key = typeof layerOrHandler === 'string' ? `${event}:${layerOrHandler}` : event
			const fn = (typeof layerOrHandler === 'function' ? layerOrHandler : handler) as (
				...a: unknown[]
			) => void

			if (!this.handlers.has(key)) this.handlers.set(key, new Set())

			this.handlers.get(key)?.add(fn)
		}

		off() {}

		emit(event: string, payload?: unknown) {
			for (const fn of this.handlers.get(event) ?? []) fn(payload)
		}

		addSource(id: string, data: unknown) {
			this.sources.set(id, {
				data,
				setData: (next: unknown) => this.sources.set(id, { data: next }),
			})
		}

		getSource(id: string) {
			return this.sources.get(id) as { setData: (d: unknown) => void } | undefined
		}

		removeSource(id: string) {
			this.sources.delete(id)
		}

		addLayer(spec: { id: string }) {
			this.layers.set(spec.id, spec)
		}

		getLayer(id: string) {
			return this.layers.get(id)
		}

		removeLayer(id: string) {
			this.layers.delete(id)
		}

		setPaintProperty() {}
		jumpTo() {}
		getCanvas() {
			return { style: {} as CSSStyleDeclaration }
		}

		remove() {
			this.handlers.clear()
			this.sources.clear()
			this.layers.clear()
		}
	}

	class FakeMarker {
		element: HTMLElement

		constructor(opts: { element: HTMLElement }) {
			this.element = opts.element
		}

		setLngLat() {
			return this
		}

		addTo(map: { container: HTMLElement }) {
			map.container.appendChild(this.element)

			return this
		}

		remove() {
			this.element.remove()
		}
	}

	return { Map: FakeMap, Marker: FakeMarker, default: { Map: FakeMap, Marker: FakeMarker } }
})

// ── Browser API stubs ───────────────────────────────

if (typeof window.matchMedia !== 'function') {
	Object.defineProperty(window, 'matchMedia', {
		writable: true,
		value: vi.fn().mockImplementation((query: string) => ({
			matches: false,
			media: query,
			onchange: null,
			addEventListener: vi.fn(),
			removeEventListener: vi.fn(),
			addListener: vi.fn(),
			removeListener: vi.fn(),
			dispatchEvent: vi.fn(),
		})),
	})
}

if (typeof window.ResizeObserver !== 'function') {
	window.ResizeObserver = class ResizeObserver {
		observe() {}
		unobserve() {}
		disconnect() {}
	} as unknown as typeof window.ResizeObserver
}
