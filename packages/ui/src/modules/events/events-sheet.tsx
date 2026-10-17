'use client'

import { Pin } from 'lucide-react'
import { useLayoutEffect, useSyncExternalStore } from 'react'
import { Button } from '../../components/button'
import { Icon } from '../../components/icon'
import {
	Sheet,
	SheetBody,
	SheetClose,
	SheetFooter,
	SheetPanel,
	SheetTitle,
} from '../../components/sheet'
import { cn } from '../../core'
import { useSidebarLayoutPlacement } from '../../layouts/sidebar/sidebar'
import { k } from '../../recipes/kata/events'
import { k as offcanvas } from '../../recipes/kata/offcanvas'
import { Flex } from '../../structure/flex'
import { resolveVariant } from '../../types'
import { hasEventsDock, setEventsPinned, subscribeDocks } from './engine/events-setting'
import { useEventsView } from './use-events-view'

// The server renders no panel.
const noDock = () => false

/** Props of {@link EventsSheet}. @internal */
export type EventsSheetProps = { open: boolean; onOpenChange: (open: boolean) => void }

/**
 * The bottom sheet of the events: the view of `useEventsView` in a sheet that
 * takes the height of its content, up to the height of the screen, with a
 * body that scrolls. Where the enclosing `SidebarLayout` is inline, Pin closes
 * the sheet and docks the view on the end edge of the page. Pin shows only
 * while the page holds an `EventsAside`, which is the place of the docked
 * view, and only where that aside shows. The store records nothing while the sheet is
 * on screen, so the sheet does not record itself.
 *
 * @internal
 */
export function EventsSheet({ open, onOpenChange }: EventsSheetProps) {
	// The closed sheet stays mounted, and it does not render for each new event.
	// Each open starts on the list.
	const { store, label, title, actions, body, footer } = useEventsView(open)

	const dockable = useSyncExternalStore(subscribeDocks, hasEventsDock, noDock)

	// Outside a sidebar layout no aside shows, so Pin never shows.
	const layout = useSidebarLayoutPlacement() ?? 'drawer'

	// A layout effect runs before the effect of the overlay that reports the
	// open, so the store does not record the open of the sheet. A sheet that
	// unmounts while it is open does not leave the store paused.
	useLayoutEffect(() => {
		store.setPaused(open)

		return () => {
			store.setPaused(false)
		}
	}, [store, open])

	return (
		<Sheet open={open} onOpenChange={onOpenChange}>
			<SheetPanel side="bottom" className="max-h-full">
				{/* The row takes the inset of the title, as the slot does. */}
				<Flex wrap align="center" gap="md" className={cn(k.row)}>
					<SheetTitle className="sr-only p-0">{label}</SheetTitle>
					{title}
					{actions}
					{/* A pinned panel shows in the inline layout only. */}
					{dockable && (
						<Button
							variant="bare"
							size="sm"
							aria-label="Pin"
							className={resolveVariant(layout, offcanvas.inline.inlineFlex)}
							onClick={() => {
								setEventsPinned(true)

								onOpenChange(false)
							}}
						>
							<Icon icon={<Pin />} />
						</Button>
					)}
				</Flex>
				<SheetBody className="min-h-0 flex-1 overflow-auto">{body}</SheetBody>
				<SheetFooter className="justify-between">
					<Flex gap="sm">{footer}</Flex>
					<SheetClose />
				</SheetFooter>
			</SheetPanel>
		</Sheet>
	)
}
