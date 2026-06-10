'use client'

import type { ComponentPropsWithoutRef, ReactNode, Ref } from 'react'
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
} & Omit<ComponentPropsWithoutRef<'button'>, 'href' | 'ref' | 'className' | 'children' | 'type'>

export function ButtonHeadless({
	href,
	ref,
	'data-slot': slot = 'button',
	className,
	loading = false,
	children,
	...props
}: ButtonHeadlessProps) {
	if (href !== undefined) {
		return (
			<Link
				ref={ref as Ref<HTMLAnchorElement>}
				data-slot={slot}
				href={href}
				className={className}
				{...(props as Omit<ComponentPropsWithoutRef<typeof Link>, 'href' | 'className'>)}
				{...(loading && loadingProps)}
			>
				{children}
			</Link>
		)
	}

	const bareButtonProps = props as Omit<ComponentPropsWithoutRef<'button'>, 'className'>

	return (
		<button
			ref={ref as Ref<HTMLButtonElement>}
			data-slot={slot}
			type="button"
			className={className}
			{...bareButtonProps}
			disabled={loading || bareButtonProps.disabled}
			aria-busy={loading || undefined}
		>
			{children}
		</button>
	)
}
