'use client'

import type { ComponentProps, ReactNode, Ref } from 'react'
import { Link } from '../link'
import { loadingProps } from './button-constants'

// Loose type at the call boundary: the public discriminated union lives on
// `ButtonProps`; this internal helper accepts the post-destructure rest and
// casts to the target element type at each spread.
type ButtonHeadlessProps = {
	href?: string
	ref?: Ref<HTMLButtonElement> | Ref<HTMLAnchorElement>
	'data-slot'?: string
	className?: string
	loading?: boolean
	children?: ReactNode
} & Omit<ComponentProps<'button'>, 'href' | 'ref' | 'className' | 'children'>

/**
 * Unstyled `Button` fallback rendered under the headless provider: a bare
 * `<button>`, or a `<Link>` anchor when `href` is set. Drops recipe classes,
 * motion, and density resolution, and renders the content that Button builds.
 * Applies {@link loadingProps} to a loading button or anchor.
 *
 * @internal
 */
export function ButtonHeadless({
	href,
	ref,
	'data-slot': slot = 'button',
	className,
	loading = false,
	children,
	type,
	...props
}: ButtonHeadlessProps) {
	if (href !== undefined) {
		return (
			<Link
				ref={ref as Ref<HTMLAnchorElement>}
				data-slot={slot}
				href={href}
				type={type}
				className={className}
				{...(props as Omit<ComponentProps<typeof Link>, 'href' | 'className'>)}
				{...(loading && loadingProps)}
			>
				{children}
			</Link>
		)
	}

	return (
		<button
			ref={ref as Ref<HTMLButtonElement>}
			data-slot={slot}
			className={className}
			{...props}
			type={type}
			{...(loading && loadingProps)}
		>
			{children}
		</button>
	)
}
