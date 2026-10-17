'use client'

import type { ComponentProps, Ref } from 'react'
import { Link } from '../link'
import { loadingProps, lockedProps } from './button-constants'

// Loose type at the call boundary: the public discriminated union lives on
// `ButtonProps`; this internal helper accepts the post-destructure rest and
// casts to the target element type at each spread.
type ButtonHeadlessProps = {
	href?: string
	ref?: Ref<HTMLButtonElement> | Ref<HTMLAnchorElement>
	'data-slot'?: string
	loading?: boolean
	/** Whether a locked scope makes the button inert. */
	locked?: boolean
} & Omit<ComponentProps<'button'>, 'href' | 'ref'>

/**
 * Unstyled `Button` fallback rendered under the headless provider: a bare
 * `<button>`, or a `<Link>` anchor when `href` is set. Drops recipe classes,
 * motion, and density resolution, and renders the content that Button builds.
 * Applies {@link loadingProps} to a loading button or anchor, and
 * {@link lockedProps} to a button in a locked scope.
 *
 * @internal
 */
export function ButtonHeadless({
	href,
	ref,
	'data-slot': slot = 'button',
	className,
	loading = false,
	locked = false,
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
			{...(locked && lockedProps)}
			{...(loading && loadingProps)}
		>
			{children}
		</button>
	)
}
