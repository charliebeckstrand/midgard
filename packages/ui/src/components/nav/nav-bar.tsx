'use client'

import type { ComponentProps } from 'react'
import { cn } from '../../core'
import { ActiveIndicatorScope } from '../../primitives/active-indicator'
import { defineMessages } from '../../primitives/intl/intl-messages'
import { useIntl } from '../../primitives/intl/use-intl'
import { k, type NavBarVariants } from '../../recipes/kata/nav'
import { NavBarContext } from './context'

const messages = defineMessages({
	label: {
		id: 'ui.navBar.label',
		defaultMessage: 'Main',
		description:
			'The name of the main navigation landmark of a page, which a screen reader speaks with its role, as in "Main navigation".',
	},
})

/** Props for {@link NavBar}: recipe `variant` plus native `<nav>` attributes. */
export type NavBarProps = NavBarVariants &
	Omit<ComponentProps<'nav'>, 'aria-label'> & {
		/**
		 * The accessible name of the landmark. Give each navigation landmark its
		 * own name when a page shows more than one.
		 * @defaultValue `'Main'`, in the language of the reader.
		 */
		'aria-label'?: string
	}

/**
 * Horizontal top-level navigation landmark; establishes an active-indicator
 * scope for its child items. The items scroll in a row inside the frame. While
 * they overflow, the edge with more items behind it fades.
 *
 * @remarks
 * That scope resolves nothing in any valid composition today. The only
 * `ActiveIndicator` is `NavItem`, which always sits inside a `NavList` that
 * opens a nearer scope of its own. It stays because this doc promises it.
 * Dropping it is a contract change, not a cleanup. Pagination is the clean
 * contrast: only its list opens a scope.
 */
export function NavBar({
	variant = 'solid',
	'aria-label': ariaLabel,
	className,
	children,
	...props
}: NavBarProps) {
	const intl = useIntl()

	const slots = k({ variant })

	return (
		<NavBarContext value={true}>
			<ActiveIndicatorScope>
				<nav
					data-slot="nav-bar"
					aria-label={ariaLabel ?? intl.formatMessage(messages.label)}
					className={cn(slots.bar.base, className)}
					{...props}
				>
					<div data-slot="nav-bar-rail" className={slots.bar.rail}>
						{children}
					</div>
				</nav>
			</ActiveIndicatorScope>
		</NavBarContext>
	)
}
