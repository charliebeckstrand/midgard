'use client'

import { PinOff } from 'lucide-react'
import { Button } from '../../components/button'
import { Heading } from '../../components/heading'
import { Icon } from '../../components/icon'
import { cn } from '../../core'
import { k } from '../../recipes/kata/events'
import { Flex } from '../../structure/flex'
import { setEventsPinned } from './engine/events-setting'
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
	const { label, title, actions, body, footer } = useEventsView({ live: true })

	return (
		<div className={cn(k.panel.base)}>
			<Flex wrap align="center" gap="md" className={cn(k.row)}>
				<Heading level={2} className="sr-only">
					{label}
				</Heading>
				{title}
				{actions}
				<Button variant="bare" size="sm" aria-label="Unpin" onClick={() => setEventsPinned(false)}>
					<Icon icon={<PinOff />} />
				</Button>
			</Flex>
			<div className={cn(k.panel.body)}>{body}</div>
			<Flex align="center" gap="sm" className={cn(k.panel.footer)}>
				{footer}
			</Flex>
		</div>
	)
}
