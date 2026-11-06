'use client'

import { ThumbsDown, ThumbsUp } from 'lucide-react'
import type { ComponentProps } from 'react'
import { ToggleIconButton } from '../../components/toggle-icon-button'
import { cn } from '../../core/cn'
import { useControllable } from '../../hooks/use-controllable'
import { defineMessages } from '../../primitives/intl/intl-messages'
import { useIntl } from '../../primitives/intl/use-intl'
import { k } from '../../recipes/kata/chat-message'

const labels = defineMessages({
	good: {
		id: 'ui.chat.goodReply',
		defaultMessage: 'Good reply',
		description: 'The name of the button that rates a reply of the assistant as good.',
	},
	bad: {
		id: 'ui.chat.badReply',
		defaultMessage: 'Bad reply',
		description: 'The name of the button that rates a reply of the assistant as bad.',
	},
})

/** The rating of a reply: good or bad. */
export type ChatVerdict = 'good' | 'bad'

/** Props for {@link ChatFeedback}. The root `<div>` takes the rest. */
export type ChatFeedbackProps = Omit<
	ComponentProps<'div'>,
	'children' | 'defaultValue' | 'onChange'
> & {
	/**
	 * The rating, or `null` for none. Pair it with `onValueChange`.
	 *
	 * @defaultValue Uncontrolled, with `defaultValue` as the first rating.
	 */
	value?: ChatVerdict | null
	/**
	 * The first rating when uncontrolled.
	 * @defaultValue null
	 */
	defaultValue?: ChatVerdict | null
	/** Fires with the new rating, or with `null` when the reader presses the pressed button again. */
	onValueChange?: (value: ChatVerdict | null) => void
}

/**
 * A pair of toggle buttons that rate a reply: good and bad. Put it in the
 * `actions` of a {@link ChatMessage}, or return it from the `actions` of a
 * {@link ChatTranscript}, and send the rating with the id of the message.
 *
 * @remarks
 * One rating at a time: a press on one button releases the other, and a press
 * on the pressed button clears the rating. Each button reports its state as
 * `aria-pressed`, and its name says the rating it gives. The component holds no
 * policy: it does not send the rating, and it does not hide after a press.
 */
export function ChatFeedback({
	value: valueProp,
	defaultValue,
	onValueChange,
	className,
	...props
}: ChatFeedbackProps) {
	const intl = useIntl()

	const [value, setValue] = useControllable<ChatVerdict>({
		value: valueProp,
		defaultValue: defaultValue ?? undefined,
		onValueChange,
	})

	const toggle = (verdict: ChatVerdict) => (pressed: boolean) => setValue(pressed ? verdict : null)

	return (
		<div data-slot="chat-feedback" {...props} className={cn(k().feedback, className)}>
			<ToggleIconButton
				size="sm"
				aria-label={intl.formatMessage(labels.good)}
				pressed={value === 'good'}
				onPressedChange={toggle('good')}
				icon={<ThumbsUp />}
				pressedIcon={<ThumbsUp fill="currentColor" />}
			/>
			<ToggleIconButton
				size="sm"
				aria-label={intl.formatMessage(labels.bad)}
				pressed={value === 'bad'}
				onPressedChange={toggle('bad')}
				icon={<ThumbsDown />}
				pressedIcon={<ThumbsDown fill="currentColor" />}
			/>
		</div>
	)
}
