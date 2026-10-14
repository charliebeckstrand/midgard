'use client'

import { Pin } from 'lucide-react'
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
import { k } from '../../recipes/kata/events'
import { Flex } from '../../structure/flex'
import { setEventsPinned } from './engine/events-setting'
import { useEventsPause } from './use-events-pause'
import { useEventsView } from './use-events-view'

/** Props of {@link EventsSheet}. @internal */
export type EventsSheetProps = { open: boolean; onOpenChange: (open: boolean) => void }

/**
 * The bottom sheet of the events: the view of `useEventsView` in a sheet that
 * takes the height of its content, up to the height of the screen, with a
 * body that scrolls. From `lg` up, Pin closes the sheet and docks the view
 * on the end edge of the page. The store records nothing while the sheet is
 * on screen, so the sheet does not record itself.
 *
 * @internal
 */
export function EventsSheet({ open, onOpenChange }: EventsSheetProps) {
	// The closed sheet stays mounted, and it does not render for each new event.
	// Each open starts on the list.
	const { store, label, title, actions, body, footer } = useEventsView({ live: open, reset: open })

	useEventsPause(store, open)

	return (
		<Sheet open={open} onOpenChange={onOpenChange}>
			<SheetPanel side="bottom" className="max-h-full">
				{/* The row takes the inset of the title, as the slot does. */}
				<Flex wrap align="center" gap="md" className={cn(k.row)}>
					<SheetTitle className="sr-only p-0">{label}</SheetTitle>
					{title}
					{actions}
					{/* A pinned panel has room from `lg` up only. */}
					<Button
						variant="bare"
						size="sm"
						aria-label="Pin"
						className="max-lg:hidden"
						onClick={() => {
							setEventsPinned(true)

							onOpenChange(false)
						}}
					>
						<Icon icon={<Pin />} />
					</Button>
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
