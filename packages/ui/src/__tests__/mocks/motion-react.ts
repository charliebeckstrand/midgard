import {
	type ComponentType,
	createElement,
	forwardRef,
	type ReactNode,
	useEffect,
	useRef,
} from 'react'
import { vi } from 'vitest'

/**
 * `motion/react` mock applied globally via `setup/module-mocks.ts`.
 *
 * Replaces every animated wrapper with a plain HTML element (no animation
 * runtime required in jsdom). Animations are modelled as instant: when a
 * component's `animate` target changes, `onAnimationComplete` fires on the
 * next commit, so lifecycle gated on completion (e.g. the current primitive's
 * deferred exit unmount) proceeds deterministically. Mount does not fire,
 * mirroring the library under `initial={false}`.
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

	// Surfaces the `layout` prop as `data-layout`, making the FLIP opt-in observable
	// (e.g. the grid's animated sort rows). Like the offsets below, it appears only
	// when the prop is present, and nothing asserts its absence.
	if (props.layout !== undefined) clean['data-layout'] = String(props.layout)

	// Surfaces the enter offset as `data-initial-x` / `data-initial-y`, making the
	// position → slide-direction mapping observable (e.g. ToastAlert's vertical
	// slide, the chart reference rules' value-axis rise). Harmless elsewhere: each
	// is emitted only when that axis's `initial` offset is present, and nothing
	// asserts its absence.
	const initial = props.initial as { x?: unknown; y?: unknown } | undefined

	if (initial?.x !== undefined) clean['data-initial-x'] = String(initial.x)

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

// `motion.create(Component)` / `motion.create('tag')`: wrap the target so motion
// props are stripped and the ref reaches it, mirroring the real factory (used by
// the grid's animated row, `motion.create(TableRow)`). Cached per target so the
// wrapper's identity holds across renders, like the tag components above.
const createdComponents = new Map<
	unknown,
	ReturnType<typeof forwardRef<unknown, Record<string, unknown>>>
>()

function createMotionComponent(Component: string | ComponentType<Record<string, unknown>>) {
	let created = createdComponents.get(Component)

	if (!created) {
		created = forwardRef<unknown, Record<string, unknown>>((props, ref) =>
			createElement(Component, { ref, ...stripMotionProps(props) }),
		)

		created.displayName = `motion.create(${
			typeof Component === 'string'
				? Component
				: (Component.displayName ?? Component.name ?? 'Component')
		})`

		createdComponents.set(Component, created)
	}

	return created
}

const handler: ProxyHandler<object> = {
	get(_, tag: string) {
		// `motion.create` is the component factory, not an element tag.
		if (tag === 'create') return createMotionComponent

		let component = components.get(tag)

		if (!component) {
			component = forwardRef<unknown, Record<string, unknown>>((props, ref) => {
				const onAnimationComplete = props.onAnimationComplete as
					| ((definition: unknown) => void)
					| undefined

				// Serialized so target identity changes across renders don't count
				// as animations; only a genuinely different target completes.
				const target = JSON.stringify(props.animate)

				const previousTarget = useRef(target)

				useEffect(() => {
					if (previousTarget.current === target) return

					previousTarget.current = target

					onAnimationComplete?.(props.animate)
				})

				return createElement(tag, { ref, ...stripMotionProps(props) })
			})

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
