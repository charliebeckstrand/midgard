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
