'use client'

import { ChevronLeft, ChevronRight } from 'lucide-react'
import { Button } from '../../components/button'
import { lockedProps } from '../../components/button/button-constants'
import { Icon } from '../../components/icon'
import { defineMessages } from '../../primitives/intl/intl-messages'
import { useIntl } from '../../primitives/intl/use-intl'
import { k } from '../../recipes/kata/chat-message'
import type { ChatBranch } from './engine/chat-branch/types'

/** @internal */
const messages = defineMessages<{
	group: Record<never, never>
	previous: Record<never, never>
	next: Record<never, never>
	position: { index: number; count: number }
}>({
	group: {
		id: 'ui.chat.versions',
		defaultMessage: 'Versions',
		description:
			'The name of the controls below a chat message that show its other versions. A retry or an edit makes a version.',
	},
	previous: {
		id: 'ui.chat.previousVersion',
		defaultMessage: 'Previous version',
		description: 'The name of the button that shows the previous version of a chat message.',
	},
	next: {
		id: 'ui.chat.nextVersion',
		defaultMessage: 'Next version',
		description: 'The name of the button that shows the next version of a chat message.',
	},
	position: {
		id: 'ui.chat.versionPosition',
		defaultMessage: '{index, number} of {count, number}',
		description:
			'The version of a chat message that shows, such as "2 of 3". The index counts from 1, and the count is the number of versions.',
	},
})

/** The chevron that points to the start of the line, and mirrors in a right-to-left document. @internal */
const PREVIOUS_ICON = <Icon icon={<ChevronLeft />} className="rtl:-scale-x-100" />

/** The chevron that points to the end of the line, and mirrors in a right-to-left document. @internal */
const NEXT_ICON = <Icon icon={<ChevronRight />} className="rtl:-scale-x-100" />

/**
 * The switcher of a chat message with more than one branch: a previous
 * button, the position such as `2 of 3`, and a next button, in a `<fieldset>`
 * that names them as a group. It is its own
 * client module, so that a message with one branch reads no context and
 * renders on the server.
 *
 * @remarks
 * The button at an end is off: `aria-disabled`, with the look of a disabled
 * button, and a press does nothing. It is not `disabled`. A press that reaches
 * an end thus keeps the focus on its button, and the focus does not fall to
 * the body. Without `onBranchChange`, both buttons are off.
 *
 * @internal
 */
export function ChatMessageBranch({
	branch,
	onBranchChange,
}: {
	branch: ChatBranch
	onBranchChange?: (id: string) => void
}) {
	const intl = useIntl()

	const { index, ids } = branch

	/** The props of the button that shows the branch at `to`. */
	const step = (to: number) => {
		const id = ids[to]

		return id === undefined || onBranchChange === undefined
			? lockedProps
			: { onClick: () => onBranchChange(id) }
	}

	return (
		<fieldset
			aria-label={intl.formatMessage(messages.group)}
			data-slot="chat-message-branch"
			className={k().branch}
		>
			<Button
				type="button"
				variant="plain"
				size="sm"
				// A switch of the branch writes no field, so a locked scope leaves it live.
				lockable={false}
				aria-label={intl.formatMessage(messages.previous)}
				{...step(index - 1)}
			>
				{PREVIOUS_ICON}
			</Button>
			<span>{intl.formatMessage(messages.position, { index: index + 1, count: ids.length })}</span>
			<Button
				type="button"
				variant="plain"
				size="sm"
				lockable={false}
				aria-label={intl.formatMessage(messages.next)}
				{...step(index + 1)}
			>
				{NEXT_ICON}
			</Button>
		</fieldset>
	)
}
