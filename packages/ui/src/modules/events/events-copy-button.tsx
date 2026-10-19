'use client'

import { Button } from '../../components/button'
import { useCopyButtonState } from '../../components/copy-button'
import { useIntl } from '../../primitives/intl/use-intl'
import { eventsMessages } from './events-messages'

/**
 * A button with the text label "Copy" that copies `text`, with the copied
 * state of `CopyButton`. The view gives a function, so the text builds only
 * on a press, not in each render of a live list.
 *
 * @internal
 */
export function EventsCopyButton({ text }: { text: () => string }) {
	const { copied, copy } = useCopyButtonState({ text })

	const intl = useIntl()

	return (
		<Button size="sm" color={copied ? 'green' : undefined} onClick={() => void copy()}>
			{intl.formatMessage(copied ? eventsMessages.copied : eventsMessages.copy)}
		</Button>
	)
}
