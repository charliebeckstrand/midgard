'use client'

import type { ComponentProps } from 'react'
import { useHeadless } from './context'

/** Props for {@link HeadlessShell}: the standard `span` attributes. */
export type HeadlessShellProps = ComponentProps<'span'>

/**
 * A wrapper `<span>` that exists only to style or to place its content, such
 * as the slot of an affix or a row of actions. Under `<HeadlessProvider>`, it
 * renders its content alone, with no element. The content stays, because it
 * is not chrome: a clear button still clears.
 *
 * @see {@link useHeadlessSlots}: the classes that a headless component drops.
 */
export function HeadlessShell({ children, ...props }: HeadlessShellProps) {
	if (useHeadless()) return children

	return <span {...props}>{children}</span>
}
