'use client'

import { BREAKPOINT_WIDTHS, type MinBreakpoint } from '../types/responsive'
import { useMediaQuery } from './use-media-query'

/*
 * Re-exported here, not only from `types`: it is this hook's parameter type, and the types
 * barrel is not one of the package's entry points (`./core`, `./hooks`, `./primitives/*`,
 * `./providers/*`, `./modules/*`, and components). A consumer that can call the hook can
 * name its argument.
 */
export type { MinBreakpoint }

/**
 * True when the viewport has reached `name`, the same breakpoint the `name:` class prefix
 * responds to. Defaults to true during SSR, like every hook in this family.
 *
 * The hook to reach for whenever JavaScript needs to answer a question the layout already
 * answers in CSS — which control a press opens, which surface a workflow uses, whether a
 * list is a table or a stack of cards. {@link useMinWidth} takes a pixel literal, which
 * means each call site transcribes the scale from memory and none of them move if the theme
 * changes; this takes the name, so `lg` here and `lg:` there are the same fact.
 *
 * Prefer CSS where CSS can do the job: a thing that is merely *hidden* below a breakpoint
 * should be hidden by a class, not unmounted by a hook. This is for the cases where the
 * markup itself differs — a different component, a different handler — and the answer has
 * to exist in JavaScript before the render happens.
 *
 * @param name - Breakpoint name; see {@link BREAKPOINT_WIDTHS}.
 *
 * @example
 * const wide = useMinBreakpoint('lg')
 */
export function useMinBreakpoint(name: MinBreakpoint): boolean {
	return useMediaQuery(`(min-width: ${BREAKPOINT_WIDTHS[name]})`)
}
