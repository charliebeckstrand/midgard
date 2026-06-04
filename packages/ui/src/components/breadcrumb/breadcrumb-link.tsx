import { cn } from '../../core'
import { Polymorphic, type PolymorphicProps } from '../../primitives/polymorphic'
import { k } from '../../recipes/kata/breadcrumb'

export type BreadcrumbLinkProps = {
	current?: boolean
	className?: string
} & PolymorphicProps<'span'>

/**
 * A breadcrumb crumb: a link when `href` is set, otherwise a `<span>` marked
 * `aria-current="page"` for the current location. Routes through `Polymorphic`
 * so href dispatch and the app's registered link component are shared with the
 * rest of the library; breadcrumb supplies its own `k.link` styling.
 */
export function BreadcrumbLink({
	current = false,
	className,
	href,
	children,
	...props
}: BreadcrumbLinkProps) {
	return (
		<Polymorphic
			as="span"
			href={href}
			data-slot="breadcrumb-link"
			aria-current={current && href === undefined ? 'page' : undefined}
			className={cn(k.link({ current }), className)}
			{...props}
		>
			{children}
		</Polymorphic>
	)
}
