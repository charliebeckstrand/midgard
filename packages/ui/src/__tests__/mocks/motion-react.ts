import { createElement, forwardRef, type ReactNode } from 'react'
import { vi } from 'vitest'

/**
 * `motion/react` mock applied globally via `setup/module-mocks.ts`.
 *
 * Replaces every animated wrapper with a plain HTML element (no animation
 * runtime required in jsdom).
 */

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
	'layoutDependency',
	'onAnimationComplete',
	'onAnimationStart',
])

function stripMotionProps(props: Record<string, unknown>) {
	const clean: Record<string, unknown> = {}

	for (const [k, v] of Object.entries(props)) {
		if (!MOTION_PROPS.has(k)) clean[k] = v
	}

	// Surfaces the vertical enter offset as `data-initial-y`, making the
	// position → slide-direction mapping observable (e.g. ToastAlert). Harmless
	// elsewhere: only emitted when an `initial.y` is present, and nothing
	// asserts its absence.
	const initial = props.initial as { y?: unknown } | undefined

	if (initial?.y !== undefined) clean['data-initial-y'] = String(initial.y)

	return clean
}

// Cache one component per tag. A fresh `forwardRef` on every property access
// makes `motion.div` a new component type each render; React remounts the
// subtree every render, spinning into an infinite mount loop when a child calls
// setState on mount (e.g. panel slot registration).
const components = new Map<
	string,
	ReturnType<typeof forwardRef<unknown, Record<string, unknown>>>
>()

const handler: ProxyHandler<object> = {
	get(_, tag: string) {
		let component = components.get(tag)

		if (!component) {
			component = forwardRef<unknown, Record<string, unknown>>((props, ref) =>
				createElement(tag, { ref, ...stripMotionProps(props) }),
			)

			component.displayName = `motion.${tag}`

			components.set(tag, component)
		}

		return component
	},
}

const motion = new Proxy({}, handler)

function AnimatePresence({ children }: { children: ReactNode }) {
	return children
}

function LayoutGroup({ children }: { children: ReactNode }) {
	return children
}

function MotionConfig({ children }: { children: ReactNode }) {
	return children
}

function useAnimate(): [{ current: null }, (...args: unknown[]) => void] {
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

// Derives a static motion value from a source: `.get()` applies the transform
// to the source's current value. No reactivity is needed in jsdom, where the
// animation runtime is stubbed and nothing reads per-frame updates.
function useTransform<I, O>(source: { get: () => I } | (() => O), transform?: (value: I) => O) {
	const read = () =>
		typeof source === 'function' ? source() : transform ? transform(source.get()) : source.get()
	return {
		get: read,
		set: () => {},
		on: () => () => {},
	}
}

// Reads the reduced-motion preference from `window.matchMedia`, mirroring the
// real hook. Defaults to `false` via the jsdom matchMedia stub; a test forces
// the reduced path with `stubMatchMedia` + `vi.unstubAllGlobals()` in
// afterEach. No per-file `vi.mock` (which races the global mock under the
// shared vmThreads module cache) and no module-level state to leak between
// files.
function useReducedMotion(): boolean {
	return typeof window !== 'undefined' && typeof window.matchMedia === 'function'
		? window.matchMedia('(prefers-reduced-motion: reduce)').matches
		: false
}

export default {
	motion,
	AnimatePresence,
	LayoutGroup,
	MotionConfig,
	useAnimate,
	useMotionValue,
	useReducedMotion,
	useTransform,
}
