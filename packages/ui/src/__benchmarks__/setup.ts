import type { ReactNode } from 'react'
import { vi } from 'vitest'

// motion/react shim: strips animation props; components mount without a
// full animation runtime.
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

	// One component per tag, cached: a fresh identity per `motion.<tag>` access
	// would change the element type on every re-render, silently remounting the
	// subtree under it and corrupting any bench that re-renders a mounted tree.
	const components = new Map<unknown, unknown>()

	/** Wraps a tag or component so it renders without the animation props. */
	function wrap(type: unknown) {
		if (!components.has(type)) {
			components.set(
				type,
				forwardRef((props: Record<string, unknown>, ref: unknown) =>
					createElement(type as string, { ref, ...stripMotionProps(props) }),
				),
			)
		}

		return components.get(type)
	}

	const handler: ProxyHandler<object> = {
		// `motion.create(Component)` wraps a custom component (the grid's animated
		// row wraps `TableRow` that way); every other key is a tag.
		get: (_, key: string) => (key === 'create' ? wrap : wrap(key)),
	}

	const motion = new Proxy({}, handler)

	function AnimatePresence({ children }: { children: ReactNode }) {
		return children
	}

	function MotionConfig({ children }: { children: ReactNode }) {
		return children
	}

	function LayoutGroup({ children }: { children: ReactNode }) {
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

	/** A derived value that reads through the source on demand, as the real one does. */
	function useTransform<T, R>(source: { get: () => T }, map: (value: T) => R) {
		return { get: () => map(source.get()), set: () => {}, on: () => () => {} }
	}

	// The benches measure the shipped animated path, so the shim answers as a
	// machine with motion enabled — reporting a reduced-motion preference would
	// let components take their static branch and score work they don't do.
	function useReducedMotion() {
		return false
	}

	return {
		motion,
		AnimatePresence,
		LayoutGroup,
		MotionConfig,
		useAnimate,
		useMotionValue,
		useReducedMotion,
		useTransform,
	}
})

// Browser shims, installed only in jsdom runs. Pure-logic benchmark files
// opt into `node` via `// @vitest-environment node`, where `window` is
// undefined and the shims do not run.

if (typeof window !== 'undefined') {
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

	if (typeof Element.prototype.scrollIntoView !== 'function') {
		Element.prototype.scrollIntoView = vi.fn()
	}
}
