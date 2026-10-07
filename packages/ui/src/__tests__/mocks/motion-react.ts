import type { MotionValue } from 'motion/react'
import {
	type ComponentType,
	createContext,
	createElement,
	forwardRef,
	type ReactNode,
	use,
	useEffect,
	useRef,
} from 'react'
import { vi } from 'vitest'
import { noop } from '../helpers/noop'

/**
 * `motion/react` mock applied globally via `setup/module-mocks.ts`.
 *
 * Replaces every animated wrapper with a plain HTML element (no animation
 * runtime required in jsdom). Animations are modeled as instant: when a
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

	// Surfaces the enter offset as `data-initial-x` / `data-initial-y`, and a whole
	// enter transform as `data-initial-transform`, making the position →
	// slide-direction mapping observable (e.g. the vertical slide of ToastAlert and
	// Drawer, the chart reference rules' value-axis rise). Harmless elsewhere: each
	// is emitted only when that `initial` value is present.
	const initial = props.initial as { x?: unknown; y?: unknown; transform?: unknown } | undefined

	if (initial?.x !== undefined) clean['data-initial-x'] = String(initial.x)

	if (initial?.y !== undefined) clean['data-initial-y'] = String(initial.y)

	if (initial?.transform !== undefined) clean['data-initial-transform'] = String(initial.transform)

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

				const children = props.children

				const textRef = useRef<Element | null>(null)

				// A motion value child is text that Motion writes to the element, not a
				// React child. Render its value now, and write each change as the real
				// component does.
				useEffect(() => {
					if (!isMotionValue(children)) return

					return children.on('change', (latest) => {
						if (textRef.current) textRef.current.textContent = String(latest)
					})
				}, [children])

				if (!isMotionValue(children)) return createElement(tag, { ref, ...stripMotionProps(props) })

				return createElement(
					tag,
					{
						...stripMotionProps(props),
						ref: (node: Element | null) => {
							textRef.current = node

							if (typeof ref === 'function') ref(node)
							else if (ref) ref.current = node
						},
					},
					String(children.get()),
				)
			})

			component.displayName = `motion.${tag}`

			components.set(tag, component)
		}

		return component
	},
}

function isMotionValue(value: unknown): value is MotionValue {
	return typeof value === 'object' && value !== null && 'getVelocity' in value
}

const motion = new Proxy({}, handler)

function AnimatePresence({ children }: { children: ReactNode }) {
	return children
}

function LayoutGroup({ children }: { children: ReactNode }) {
	return children
}

type MotionConfigValue = { reducedMotion: 'always' | 'never' | 'user' }

// Real motion defaults `reducedMotion` to `never`, and `MotionConfig` merges its
// props over the parent config. `ReducedMotion` reads the context to skip a
// nested provider.
const MotionConfigContext = createContext<MotionConfigValue>({ reducedMotion: 'never' })

function MotionConfig({
	children,
	...config
}: Partial<MotionConfigValue> & { children: ReactNode }) {
	const parent = use(MotionConfigContext)

	return createElement(MotionConfigContext, { value: { ...parent, ...config } }, children)
}

// A stable no-op, as the real hook's `animate` is stable. A `vi.fn()` here was
// a new spy on every render, and each one stays in Vitest's worker-wide mock
// registry, which `clearMocks` walks before every test.
function useAnimate(): [{ current: null }, (...args: unknown[]) => void] {
	return [{ current: null }, noop]
}

// The real motion values, so a value an animation drives reaches what reads it,
// as the Odometer readout does. They need no animation runtime: a `set` notifies
// the subscribers at once, and a `useTransform` output follows on the next frame.
// The real `useInView` watches through the `IntersectionObserver` that the jsdom
// setup or a suite installs.
const { useInView, useMotionValue, useTransform } =
	await vi.importActual<typeof import('motion/react')>('motion/react')

// Reads the reduced-motion preference from `window.matchMedia`, mirroring the
// real hook. Defaults to `false` via the jsdom matchMedia stub; a test forces
// the reduced path with `stubMatchMedia`, and the config's `unstubGlobals`
// restores the stub before the next test. No per-file `vi.mock` (see
// setup/module-mocks.ts) and no module-level state to leak between files.
function useReducedMotion(): boolean {
	return typeof window !== 'undefined' && typeof window.matchMedia === 'function'
		? window.matchMedia('(prefers-reduced-motion: reduce)').matches
		: false
}

// `Reorder` renders its plain elements. The drag runs only in a real browser
// (see browser/motion/list-reorder.test.tsx), so the group and the item drop
// their reorder and drag props.
function ReorderGroup({
	as = 'ul',
	values: _values,
	onReorder: _onReorder,
	axis: _axis,
	...props
}: Record<string, unknown> & { as?: string }) {
	return createElement(as, stripMotionProps(props))
}

function ReorderItem({
	as = 'li',
	value: _value,
	dragListener: _dragListener,
	dragControls: _dragControls,
	onDragStart: _onDragStart,
	onDragEnd: _onDragEnd,
	...props
}: Record<string, unknown> & { as?: string }) {
	return createElement(as, stripMotionProps(props))
}

const Reorder = { Group: ReorderGroup, Item: ReorderItem }

// The controls of a drag that never starts in jsdom.
const dragControls = { start: noop, stop: noop, cancel: noop }

function useDragControls() {
	return dragControls
}

export default {
	Reorder,
	useDragControls,
	motion,
	AnimatePresence,
	LayoutGroup,
	MotionConfig,
	MotionConfigContext,
	useAnimate,
	useInView,
	useMotionValue,
	useReducedMotion,
	useTransform,
}
