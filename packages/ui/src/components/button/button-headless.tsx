'use client'

import type { ComponentProps, ReactNode, Ref } from 'react'
import { Link } from '../link'
import { LoadingSpinner } from '../loading'
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
	prefix?: ReactNode
	suffix?: ReactNode
	children?: ReactNode
} & Omit<ComponentProps<'button'>, 'href' | 'ref' | 'className' | 'children' | 'prefix'>

/**
 * Unstyled `Button` fallback rendered under the headless provider: a bare
 * `<button>`, or a `<Link>` anchor when `href` is set. Drops recipe classes,
 * motion, and density resolution, and keeps the content: `prefix`, the
 * children, and `suffix`, with the spinner in place of `prefix` while loading.
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
	prefix,
	suffix,
	children,
	type,
	...props
}: ButtonHeadlessProps) {
	const content = (
		<>
			{loading ? <LoadingSpinner /> : prefix}
			{children}
			{suffix}
		</>
	)

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
				{content}
			</Link>
		)
	}

	const bareButtonProps = props as Omit<ComponentProps<'button'>, 'className'>

	return (
		<button
			ref={ref as Ref<HTMLButtonElement>}
			data-slot={slot}
			type={type}
			className={className}
			{...bareButtonProps}
			{...(loading && loadingProps)}
		>
			{content}
		</button>
	)
}
