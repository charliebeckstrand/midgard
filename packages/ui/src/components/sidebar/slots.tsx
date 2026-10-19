'use client'

import { X } from 'lucide-react'
import { type ComponentProps, use } from 'react'
import { cn, createSlot } from '../../core'
import { defineMessages } from '../../primitives/intl/intl-messages'
import { useIntl } from '../../primitives/intl/use-intl'
import { OffcanvasContext } from '../../primitives/offcanvas'
import { k } from '../../recipes/kata/sidebar'
import { Button } from '../button'
import { Icon } from '../icon'

const messages = defineMessages({
	closeNavigation: {
		id: 'ui.sidebar.closeNavigation',
		defaultMessage: 'Close navigation',
		description: 'The name of the button that closes the navigation drawer of a narrow page.',
	},
})

/** Props for {@link SidebarHeader} (`<div>` attributes). */
export type SidebarHeaderProps = ComponentProps<'div'>

/** Props for {@link SidebarBody} (`<div>` attributes). */
export type SidebarBodyProps = ComponentProps<'div'>

/** Props for {@link SidebarFooter} (`<div>` attributes). */
export type SidebarFooterProps = ComponentProps<'div'>

/**
 * Top region of a `Sidebar` for brand or affordances. Inside an offcanvas
 * drawer it auto-appends a close button wired to the drawer's dismiss. The
 * button is named "Close navigation", in the language of the reader.
 */
export function SidebarHeader({ className, children, ...props }: SidebarHeaderProps) {
	const offcanvas = use(OffcanvasContext)

	const intl = useIntl()

	return (
		<div data-slot="sidebar-header" className={cn(k.header, className)} {...props}>
			{children}
			{offcanvas && (
				<Button
					// A close writes no field, so a locked scope, such as a submitting
					// form, leaves it live.
					lockable={false}
					type="button"
					variant="bare"
					aria-label={intl.formatMessage(messages.closeNavigation)}
					className="ms-auto"
					prefix={<Icon icon={<X />} />}
					onClick={offcanvas.close}
				/>
			)}
		</div>
	)
}

/** Scrollable main region of a `Sidebar` holding its sections and lists. */
export const SidebarBody = createSlot('div', 'sidebar-body', k.body)

/** Bottom region of a `Sidebar`, pinned below the body for footer content. */
export const SidebarFooter = createSlot('div', 'sidebar-footer', k.footer)
