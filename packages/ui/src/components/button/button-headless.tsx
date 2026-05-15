'use client'

import type { ComponentPropsWithoutRef, ReactNode, Ref } from 'react'
import { Link } from '../link'

// Type intentionally loose at the call boundary — the public discriminated
// shape lives on `ButtonProps`; this internal helper accepts the parent's
// post-destructure rest and casts to the right element type at the spread.
export type ButtonHeadlessProps = {
	href?: string
	ref?: Ref<HTMLButtonElement>
	dataSlot?: string
	className?: string
	loading?: boolean
	children?: ReactNode
} & Omit<ComponentPropsWithoutRef<'button'>, 'href' | 'ref' | 'className' | 'children' | 'type'>

export function ButtonHeadless({
	href,
	ref,
	dataSlot = 'button',
	className,
	loading = false,
	children,
	...props
}: ButtonHeadlessProps) {
	if (href !== undefined) {
		return (
			<Link
				data-slot={dataSlot}
				href={href}
				className={className}
				{...(props as Omit<ComponentPropsWithoutRef<typeof Link>, 'href' | 'className'>)}
				{...(loading && { 'aria-disabled': true, 'data-disabled': true, 'aria-busy': true })}
			>
				{children}
			</Link>
		)
	}

	const bareButtonProps = props as Omit<ComponentPropsWithoutRef<'button'>, 'className'>

	return (
		<button
			ref={ref}
			data-slot={dataSlot}
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
