import type { ReactNode } from 'react'
import { vi } from 'vitest'

// motion/react shim — strips animation props so components mount cleanly
// without a full animation runtime.
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

	function AnimatePresence({ children }: { children: ReactNode }) {
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

	return { motion, AnimatePresence, LayoutGroup, useAnimate, useMotionValue }
})

// Browser shims — only installed in jsdom runs. Pure-logic benchmark files
// opt into `node` via `// @vitest-environment node`, where `window` is
// undefined and these shims are simply skipped.

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
