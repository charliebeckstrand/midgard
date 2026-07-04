import type { ElementType } from 'react'
import { cn } from '../../core'
import { PolymorphicStatic, type PolymorphicStaticProps } from '../../primitives/polymorphic'
import { k, type TextVariants } from '../../recipes/kata/text'

/** Props for {@link Text}: the `severity`/`color` recipe axes, the polymorphic `as`/`href`/`render` surface, and the chosen element's native attributes. */
export type TextProps = TextVariants & {
	/**
	 * The element (or component) to render. Defaults to `<p>`; set `as="span"`
	 * to compose Text inside phrasing content — a button label, a table cell.
	 *
	 * @defaultValue 'p'
	 */
	as?: ElementType
	className?: string
} & PolymorphicStaticProps<'p', 'color'>

/**
 * Text styled by `severity` and `color` from the text recipe. Polymorphic:
 * renders a `<p>`, a different element via `as`, a plain anchor when `href` is
 * set, or a composed element via `render` (e.g. `render={<Link />}`) to wire
 * the app router link at the call site. Static leaf: renders in React Server
 * Components. Compose `<TextSkeleton>` in the loading tree for a placeholder.
 */
export function Text({
	as = 'p',
	severity,
	color,
	size,
	className,
	children,
	...props
}: TextProps) {
	return (
		<PolymorphicStatic
			as={as}
			data-slot="text"
			className={cn(k({ severity, color, size }), className)}
			{...props}
		>
			{children}
		</PolymorphicStatic>
	)
}
