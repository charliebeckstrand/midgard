'use client'

import type { ComponentProps, Ref } from 'react'
import type { PolymorphicProps } from '../../primitives/polymorphic'
import { useControlLock } from '../control/context'
import { Link } from '../link'
import { loadingProps, lockedProps } from './button-constants'

/** Props for {@link ButtonBase}: the polymorphic surface and the behavior flags. */
export type ButtonBaseProps = {
	/**
	 * Gates activation. The element keeps its focus.
	 * @defaultValue false
	 */
	loading?: boolean
	/**
	 * Lets a locked scope make the button inert. A button with an `href` is a
	 * link, and the lock does not reach it.
	 * @defaultValue true
	 */
	lockable?: boolean
	'data-slot'?: string
	className?: string
} & PolymorphicProps<'button'>

/**
 * The behavior of a button with no chrome: a `<button>`, or a `<Link>` anchor
 * when `href` is set. It applies {@link loadingProps} to a loading button or
 * anchor, and {@link lockedProps} to a lockable button in a locked scope. It
 * writes no classes, no density scope, and no hit area, and it renders its
 * children as they are.
 *
 * `Button` renders it with its chrome. A component that paints its own chrome,
 * such as a `Tab` or the trigger of a picker, renders it directly.
 *
 * @internal
 */
export function ButtonBase({
	href,
	ref,
	'data-slot': slot = 'button',
	loading = false,
	lockable = true,
	children,
	type,
	...props
}: ButtonBaseProps) {
	// A locked scope, such as a form that submits, makes the button inert. A link
	// leaves the page, and the lock does not reach it.
	const locked = useControlLock() && lockable && href === undefined

	if (href !== undefined) {
		return (
			<Link
				ref={ref as Ref<HTMLAnchorElement>}
				data-slot={slot}
				href={href}
				type={type}
				{...(props as Omit<ComponentProps<typeof Link>, 'href'>)}
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
			{...(props as ComponentProps<'button'>)}
			type={type as ComponentProps<'button'>['type']}
			// A loading or locked button stays enabled, so it keeps the focus that it
			// has. These props cancel its activation instead of `disabled`.
			{...(locked && lockedProps)}
			{...(loading && loadingProps)}
		>
			{children}
		</button>
	)
}
