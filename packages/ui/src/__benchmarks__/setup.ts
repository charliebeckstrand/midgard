import { vi } from 'vitest'

// motion/react shim: the test mock of `motion/react`, with elements that only
// strip the animation props.
//
// The elements of the test mock (`__tests__/mocks/motion-react.ts`) model
// animations as instant so lifecycle gated on completion resolves — a `useRef`
// + `useEffect` + an `animate` comparison per motion element per render — and
// surface `data-layout` / `data-initial-*` for tests to assert. Both are
// per-element work the shipped path never does, so a bench mounting them would
// time the mock. The shim replaces only `motion`, and takes every other export
// from the test mock, so the two mocks have the same API surface. The
// `motion/react-m` shim below reuses the elements of this one.
vi.mock('motion/react', async () => {
	const { createElement, forwardRef } = await import('react')

	const { default: mock } = await import('../__tests__/mocks/motion-react')

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

		for (const [key, value] of Object.entries(props)) {
			if (!MOTION_PROPS.has(key)) clean[key] = value
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

	return { ...mock, motion: new Proxy({}, handler) }
})

// The `m` elements of `motion/react-m` are the shim elements of `motion/react`
// for the same tags. The keys are the exports of the real module.
vi.mock('motion/react-m', async () => {
	const actual = await vi.importActual<typeof import('motion/react-m')>('motion/react-m')

	const { motion } = (await import('motion/react')) as unknown as {
		motion: Record<string, unknown>
	}

	return Object.fromEntries(Object.keys(actual).map((tag) => [tag, motion[tag]]))
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
