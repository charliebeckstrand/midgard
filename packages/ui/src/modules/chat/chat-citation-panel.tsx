'use client'

import type { ReactNode } from 'react'
import { Dialog, DialogBody, DialogHeader, DialogPanel, DialogTitle } from '../../components/dialog'
import { Drawer, DrawerBody, DrawerHeader, DrawerPanel, DrawerTitle } from '../../components/drawer'
import { useMediaQuery } from '../../hooks/use-media-query'
import { PHONE_QUERY } from '../../utilities/media-query'
import type { ChatCitation } from './engine/chat-content/types'
import type { ChatCitationTarget } from './types'

/** Props for {@link ChatCitationPanel}. @internal */
export type ChatCitationPanelProps = {
	/** Whether the panel is open. */
	open: boolean
	/** Fires when Escape, the backdrop, or the Close button closes the panel. */
	onOpenChange: (open: boolean) => void
	/**
	 * The citation that the panel shows. It stays after the close, so that the
	 * panel keeps its content while it leaves.
	 */
	citation: ChatCitation | null
	/** The target of the citation, whose `render` draws the view. */
	target: ChatCitationTarget | undefined
}

/**
 * The panel of a citation whose target has `render`: a Dialog, or a Drawer on
 * a phone ({@link PHONE_QUERY}), as the menu of a phone opens a Drawer. The
 * label of the target is the title of the panel and names it. The view is the
 * body, and the footer holds the standard Close button.
 *
 * @remarks
 * The panel is modal, so the focus goes into it, and it goes back to the
 * citation on the close.
 *
 * @internal
 */
export function ChatCitationPanel({
	open,
	onOpenChange,
	citation,
	target,
}: ChatCitationPanelProps) {
	const phone = useMediaQuery(PHONE_QUERY)

	const view: ReactNode =
		citation === null || target?.render === undefined ? null : target.render(citation)

	if (phone) {
		return (
			<Drawer open={open} onOpenChange={onOpenChange}>
				<DrawerPanel>
					<DrawerHeader>
						<DrawerTitle>{target?.label}</DrawerTitle>
					</DrawerHeader>
					<DrawerBody>{view}</DrawerBody>
				</DrawerPanel>
			</Drawer>
		)
	}

	return (
		<Dialog open={open} onOpenChange={onOpenChange}>
			<DialogPanel>
				<DialogHeader>
					<DialogTitle>{target?.label}</DialogTitle>
				</DialogHeader>
				<DialogBody>{view}</DialogBody>
			</DialogPanel>
		</Dialog>
	)
}
