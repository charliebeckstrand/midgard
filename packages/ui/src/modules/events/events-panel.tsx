'use client'

import { PinOff } from 'lucide-react'
import { Button } from '../../components/button'
import { Heading } from '../../components/heading'
import { Icon } from '../../components/icon'
import { cn } from '../../core'
import { useIntl } from '../../primitives/intl/use-intl'
import { k } from '../../recipes/kata/events'
import { Flex } from '../../structure/flex'
import { setEventsPinned } from './engine/events-setting'
import { eventsMessages } from './events-messages'
import { useEventsView } from './use-events-view'

/**
 * The pinned panel of the events: the view of `useEventsView` as a card that
 * fills the aside of the layout, with a body that scrolls. It renders for each
 * new event, one time for each frame at most. It does not pause the store, as
 * it stays on screen, so the sources skip the events in it (`data-events-tool`
 * on `EventsAside`). Unpin returns the view to the header button.
 *
 * @internal
 */
export function EventsPanel() {
	const { label, title, actions, body, footer } = useEventsView(true)

	const intl = useIntl()

	return (
		<div className={cn(k.panel.base)}>
			<Flex wrap align="center" gap="md" className={cn(k.row)}>
				<Heading level={2} className="sr-only">
					{label}
				</Heading>
				{title}
				{actions}
				<Button
					variant="bare"
					size="sm"
					aria-label={intl.formatMessage(eventsMessages.unpin)}
					onClick={() => setEventsPinned(false)}
				>
					<Icon icon={<PinOff />} />
				</Button>
			</Flex>
			{/* The body is the scroll region of the virtual list, so the list renders
			    only the rows in view. */}
			<div data-scroll-region className={cn(k.panel.body)}>
				{body}
			</div>
			<Flex align="center" gap="sm" className={cn(k.panel.footer)}>
				{footer}
			</Flex>
		</div>
	)
}
