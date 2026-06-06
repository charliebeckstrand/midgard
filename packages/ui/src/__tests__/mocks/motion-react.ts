import { createElement, forwardRef, type ReactNode } from 'react'
import { vi } from 'vitest'

/**
 * `motion/react` mock applied globally via `setup/module-mocks.ts`.
 *
 * Replaces every animated wrapper with a plain HTML element so tests run in
 * jsdom without needing a full animation runtime.
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

	return clean
}

// Cache one component per tag. Returning a fresh `forwardRef` on every property
// access makes `motion.div` a new component type each render, so React remounts
// the subtree every render — which, combined with a child that calls setState on
// mount (e.g. panel slot registration), spins into an infinite mount loop.
const components = new Map<string, ReturnType<typeof forwardRef>>()

const handler: ProxyHandler<object> = {
	get(_, tag: string) {
		let component = components.get(tag)

		if (!component) {
			component = forwardRef((props: Record<string, unknown>, ref: unknown) =>
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

// Default to "no reduced-motion preference", matching the jsdom matchMedia stub.
// Tests exercising the reduced path override this per-file via vi.mock.
function useReducedMotion(): boolean {
	return false
}

export default {
	motion,
	AnimatePresence,
	LayoutGroup,
	MotionConfig,
	useAnimate,
	useMotionValue,
	useReducedMotion,
}
