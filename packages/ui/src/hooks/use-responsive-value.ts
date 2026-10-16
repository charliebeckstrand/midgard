'use client'

import { type Breakpoint, type Responsive, valueAt } from '../types/responsive'
import { useMinBreakpoint } from './use-min-breakpoint'

/*
 * Re-exported here, not only from `types`, because it is this hook's parameter type. The
 * types barrel is not one of the package's entry points.
 */
export type { Responsive }

/**
 * The value that a responsive prop holds at the viewport now. It is the
 * JavaScript twin of the classes that `resolveVariant` gives for the same
 * value, so a component that must act on its layout (an arrow-key axis, an
 * `aria-orientation`, a motion) reads the same answer as its CSS.
 *
 * The hook reads each breakpoint, so the number of hook calls does not depend
 * on the value. During SSR each breakpoint matches, as with
 * {@link useMinBreakpoint}, so the server takes the value of the largest
 * breakpoint.
 *
 * @param value - The single or per-breakpoint value.
 * @param fallback - The value below the first breakpoint that the map names.
 * @returns The value in force at the viewport.
 *
 * @example
 * const orientation = useResponsiveValue({ initial: 'vertical', sm: 'horizontal' }, 'vertical')
 */
export function useResponsiveValue<T>(value: Responsive<T>, fallback: T): T {
	const reached: Record<Breakpoint, boolean> = {
		initial: true,
		sm: useMinBreakpoint('sm'),
		md: useMinBreakpoint('md'),
		lg: useMinBreakpoint('lg'),
		xl: useMinBreakpoint('xl'),
		'2xl': useMinBreakpoint('2xl'),
	}

	const current = (['2xl', 'xl', 'lg', 'md', 'sm'] as const).find((bp) => reached[bp]) ?? 'initial'

	return valueAt(value, current, fallback)
}
