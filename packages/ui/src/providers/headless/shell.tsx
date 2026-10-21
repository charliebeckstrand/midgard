'use client'

import type { ComponentProps } from 'react'
import { useHeadless } from './context'

/** Props for {@link Shell}: the standard `span` attributes. */
export type ShellProps = ComponentProps<'span'>

/**
 * A wrapper `<span>` that exists only to style or to place its content, such
 * as the slot of an affix or a row of actions. Under `<HeadlessProvider>`, it
 * renders its content alone, with no element. The content stays, because it
 * is not chrome: a clear button still clears.
 *
 * @see {@link useSlots}: the classes that a headless component drops.
 */
export function Shell({ children, ...props }: ShellProps) {
	if (useHeadless()) return children

	return <span {...props}>{children}</span>
}
