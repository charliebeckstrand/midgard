'use client'

import type { MouseEventHandler, ReactElement, ReactNode } from 'react'
import {
	Dialog,
	DialogBody,
	DialogClose,
	DialogFooter,
	DialogHeader,
	DialogPanel,
	DialogTitle,
} from '../../components/dialog'
import {
	Drawer,
	DrawerBody,
	DrawerClose,
	DrawerFooter,
	DrawerHeader,
	DrawerPanel,
	DrawerTitle,
} from '../../components/drawer'
import { createContext } from '../../core/create-context'
import { useMediaQuery } from '../../hooks/use-media-query'
import { PHONE_QUERY } from '../../utilities/media-query'

/** Whether the nearest {@link ChatPanel} is a Drawer. @internal */
const [ChatPanelPhoneContext, useChatPanelPhone] = createContext<boolean>('ChatPanelPhone', {
	default: false,
})

/** Props for {@link ChatPanel}. @internal */
export type ChatPanelProps = {
	/** Whether the panel is open. */
	open: boolean
	/** Fires when Escape, the backdrop, or a close control closes the panel. */
	onOpenChange: (open: boolean) => void
	/** The title of the panel. It names the panel. */
	title: ReactNode
	/**
	 * The parts of the panel: a {@link ChatPanelBody}, and a
	 * {@link ChatPanelFooter} where the panel needs its own actions. A panel
	 * with no footer shows the standard Close button.
	 */
	children: ReactNode
}

/**
 * A panel that the chat opens over the page: a Dialog, or a Drawer on a phone
 * ({@link PHONE_QUERY}), as the menu of a phone opens a Drawer. A citation
 * opens its view in one, and an action opens its form and its review in one.
 *
 * @remarks
 * The panel is modal, so the focus goes into it, and it goes back to the
 * control that opened it on the close. Its parts read the kind of panel from
 * context, so a caller writes one tree for both.
 *
 * @internal
 */
export function ChatPanel({ open, onOpenChange, title, children }: ChatPanelProps) {
	const phone = useMediaQuery(PHONE_QUERY)

	return (
		<ChatPanelPhoneContext value={phone}>
			{phone ? (
				<Drawer open={open} onOpenChange={onOpenChange}>
					<DrawerPanel>
						<DrawerHeader>
							<DrawerTitle>{title}</DrawerTitle>
						</DrawerHeader>
						{children}
					</DrawerPanel>
				</Drawer>
			) : (
				<Dialog open={open} onOpenChange={onOpenChange}>
					<DialogPanel>
						<DialogHeader>
							<DialogTitle>{title}</DialogTitle>
						</DialogHeader>
						{children}
					</DialogPanel>
				</Dialog>
			)}
		</ChatPanelPhoneContext>
	)
}

/** The scroll region of a {@link ChatPanel}. @internal */
export function ChatPanelBody({ children }: { children: ReactNode }) {
	return useChatPanelPhone() ? (
		<DrawerBody>{children}</DrawerBody>
	) : (
		<DialogBody>{children}</DialogBody>
	)
}

/** The action row of a {@link ChatPanel}. It replaces the standard Close button. @internal */
export function ChatPanelFooter({ children }: { children: ReactNode }) {
	return useChatPanelPhone() ? (
		<DrawerFooter>{children}</DrawerFooter>
	) : (
		<DialogFooter>{children}</DialogFooter>
	)
}

/** Closes the nearest {@link ChatPanel} on a click of its one child. @internal */
export function ChatPanelClose({
	children,
}: {
	children: ReactElement<{ onClick?: MouseEventHandler }>
}) {
	return useChatPanelPhone() ? (
		<DrawerClose>{children}</DrawerClose>
	) : (
		<DialogClose>{children}</DialogClose>
	)
}
