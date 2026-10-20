import type { ComponentProps } from 'react'
import { cn } from '../../core'
import { k } from '../../recipes/kata/placeholder'

/** Props for {@link Placeholder}: native `<div>` attributes, including `data-*` keys, plus the element to render. */
export type PlaceholderProps = {
	/**
	 * The element to render. A `span` stands in for inline content (a badge inside a line of
	 * text, say), where a `div` would be invalid HTML: inside a `<p>`, the parser closes the
	 * paragraph at it, and a server-rendered tree then fails to hydrate.
	 * @defaultValue 'div'
	 */
	as?: 'div' | 'span'
	/**
	 * Pulses to show that content loads. Pass `false` for a still shape, such as
	 * one that stays in place of content that did not load.
	 * @defaultValue true
	 */
	pulse?: boolean
	[key: `data-${string}`]: string | number | boolean | undefined
} & ComponentProps<'div'>

/**
 * Skeleton shape that pulses while content loads. Renders a line by default;
 * pass `className` for other shapes, and `pulse={false}` for a still one.
 * @remarks Static leaf: renders in React Server Components.
 * @remarks To join adjacent placeholders like grouped controls, render them
 * as the children of a `<Group>`.
 */
export function Placeholder({
	className,
	as: Element = 'div',
	pulse = true,
	...props
}: PlaceholderProps) {
	return (
		<Element
			data-slot="placeholder"
			aria-hidden="true"
			className={cn(k.fill, pulse && k.pulse, k.shape, className)}
			{...props}
		/>
	)
}
