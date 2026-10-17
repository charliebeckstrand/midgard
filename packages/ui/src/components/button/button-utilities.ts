import { isValidElement, type ReactNode } from 'react'
import type { ButtonVariants } from '../../recipes/kata/button'
import { Icon } from '../icon'

/**
 * Shared, element-agnostic half of {@link ButtonProps}: the recipe variants plus
 * the behavior flags and adornments common to the button and anchor branches.
 *
 * @internal
 */
export type ButtonBaseProps = ButtonVariants & {
	/**
	 * Swap the leading content for a spinner, or the icon of an icon-only
	 * button, and gate activation. The button keeps its focus.
	 * @defaultValue false
	 */
	loading?: boolean
	/**
	 * Whether a locked scope, such as a `Form` while a submit runs, makes the
	 * button inert. An inert button keeps its focus and its place in the tab
	 * order, and cancels each activation. Pass `false` for a button that must
	 * work while the scope is locked, such as the Cancel of a drawer. A library
	 * button that writes no field, such as a `Tab` or a `CopyButton`, passes
	 * `false` too. A button with an `href` is a link, and the lock does not
	 * reach it.
	 * @defaultValue true
	 */
	lockable?: boolean
	/** Content before the label; hidden while `loading`. */
	prefix?: ReactNode
	/** Content after the label. */
	suffix?: ReactNode
	'data-slot'?: string
	className?: string
}

/**
 * Whether a child reads as an icon rather than a textual label, deciding square
 * vs. control height. True for the library's `<Icon>`, a raw `<svg>`, or any
 * element carrying `data-slot="icon"`; everything else counts as a label.
 *
 * @returns `true` when `node` is an icon element, `false` otherwise.
 * @see {@link Button} for the labeled-vs-icon-only sizing branch it feeds.
 * @internal
 */
export function isIconElement(node: unknown): boolean {
	if (!isValidElement(node)) return false

	if (node.type === Icon || node.type === 'svg') return true

	const props = node.props as { 'data-slot'?: unknown }

	return props['data-slot'] === 'icon'
}

/** The `sr-only` token in a class list. @internal */
const SR_ONLY = /(?:^|\s)sr-only(?:\s|$)/

/**
 * Whether a child is visually hidden, such as an `sr-only` span that names an
 * icon-only button. Such a child takes no room, so it does not count as a label
 * for the sizing of the button.
 *
 * @returns `true` when `node` is an element with the `sr-only` class.
 * @internal
 */
export function isVisuallyHiddenElement(node: unknown): boolean {
	if (!isValidElement(node)) return false

	const { className } = node.props as { className?: unknown }

	return typeof className === 'string' && SR_ONLY.test(className)
}
