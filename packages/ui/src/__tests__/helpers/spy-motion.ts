import { createElement, type ElementType } from 'react'

type Motion = typeof import('motion/react-m')

/**
 * Wraps each element of `motion/react-m`, so that a suite can read the props
 * that each element takes. `create` stays as it is.
 *
 * A suite mocks `motion/react-m` with this function, and records what it needs
 * in `onProps`. The mock is per file, so the suite sits in `boundary/`. The
 * factory imports this file directly, not the helpers barrel.
 *
 * @param actual - The real `motion/react-m` module.
 * @param onProps - Takes the props and the tag of each element on each render.
 * @returns The module, with one wrapper for each tag.
 *
 * @example
 * ```typescript
 * vi.mock('motion/react-m', async (importActual) =>
 *   (await import('../helpers/spy-motion')).spyMotion(await importActual(), (props) => {
 *     seen.push(props.initial)
 *   }),
 * )
 * ```
 */
export function spyMotion(
	actual: Motion,
	onProps: (props: Record<string, unknown>, tag: string) => void,
): Motion {
	// One wrapper for each tag, so each element keeps its component identity.
	return Object.fromEntries(
		(Object.entries(actual) as [string, ElementType][]).map(([tag, real]) => [
			tag,
			tag === 'create'
				? real
				: (props: Record<string, unknown>) => {
						onProps(props, tag)

						return createElement(real, props)
					},
		]),
	) as Motion
}
