'use client'

import type { ComponentPropsWithoutRef, ReactNode, Ref } from 'react'
import { Link } from '../link'
import { loadingLinkProps } from './button-constants'

// Type intentionally loose at the call boundary — the public discriminated
// shape lives on `ButtonProps`; this internal helper accepts the parent's
// post-destructure rest and casts to the right element type at the spread.
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
				{...(loading && loadingLinkProps)}
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
