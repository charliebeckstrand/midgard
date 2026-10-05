import { Placeholder } from '../../components/placeholder'
import { cn } from '../../core'
import { k as kMessage } from '../../recipes/kata/chat-message'
import { k } from '../../recipes/kata/chat-transcript'
import { rangeKeys } from '../../utilities'

/** Props for {@link ChatTranscriptSkeleton}: the message count. */
export type ChatTranscriptSkeletonProps = {
	/**
	 * Message bubbles to render. The first is on the user side, and the sides
	 * then alternate.
	 * @defaultValue 4
	 */
	messages?: number
	className?: string
}

/**
 * Transcript-shaped placeholder: `messages` bubbles that alternate between
 * the user side and the assistant side, as a conversation does. A user bubble
 * holds one text line, and an assistant bubble holds two. Keyed off the
 * message count, so it does not use the size-driven `createSkeleton` factory.
 *
 * @remarks Static leaf: renders in React Server Components. Each bubble has
 * the width cap, the padding, the radius, and the side of a real bubble, and
 * each message after the first has the gap of a real transcript row. A
 * transcript holds content of no fixed length, so only one bubble of each
 * side has the box of a real bubble of the same line count. The root is
 * `aria-hidden`, so assistive technology does not find empty messages. It
 * clips in place of a scroll, so it does not take keyboard focus.
 * @see {@link ChatTranscript}
 */
export function ChatTranscriptSkeleton({ messages = 4, className }: ChatTranscriptSkeletonProps) {
	const messageKeys = rangeKeys(messages, 'message')

	return (
		<div aria-hidden="true" className={cn(k.skeleton.root, className)}>
			{messageKeys.map((messageKey, index) => {
				const sender = index % 2 === 0 ? 'user' : 'assistant'

				return (
					<div key={messageKey} className={index > 0 ? cn(k.row) : undefined}>
						<div className={cn(kMessage({ sender }))}>
							<div className={cn(k.skeleton.bubble, k.skeleton.tail[sender])}>
								{k.skeleton.lines[sender].map((width) => (
									<Placeholder key={width} className={cn(k.skeleton.line, width)} />
								))}
							</div>
						</div>
					</div>
				)
			})}
		</div>
	)
}
