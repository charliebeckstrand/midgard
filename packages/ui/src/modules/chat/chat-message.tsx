import { memo, type ReactNode, useMemo } from 'react'
import { Markdown } from '../../components/markdown'
import { cn } from '../../core'
import { type ChatMessageVariants, k } from '../../recipes/kata/chat-message'
import { ChatChart } from './chat-chart'
import { type ChatSegment, splitChatSegments } from './chat-message-segments'

/** Props for {@link ChatMessage}. */
export type ChatMessageProps = ChatMessageVariants & {
	/** Wall-clock label shown below the bubble. */
	timestamp?: ReactNode
	/** Pulses the streaming bubble content while a response streams in. */
	streaming?: boolean
	/** Action rail below the bubble (copy, retry, edit, …). */
	actions?: ReactNode
	className?: string
	/**
	 * Message text, rendered as GitHub-flavored Markdown; a ```` ```chart ````
	 * fence is lifted out of the prose and rendered as a live chart (see
	 * {@link ChatChart}).
	 */
	children: string
}

/**
 * Conversational message sided and colored by `type` (`user`, `assistant`, or
 * `system`; defaults to `assistant`), with an optional `timestamp`, `actions`
 * rail, and a `streaming` pulse over its content.
 *
 * @remarks
 * Side and color alone convey the speaker visually, so a visually hidden author
 * label ("You said", "Assistant said", or "System") announces it to assistive
 * tech once, ahead of the content.
 *
 * Prose renders as GitHub-flavored Markdown ({@link Markdown}, complete with
 * syntax-highlighted code fences) inside a colored bubble. {@link Markdown}
 * sets no color of its own, so the prose inherits the bubble's foreground for
 * free — white on the user bubble's blue fill, the default tone on the
 * assistant bubble, muted on the system bubble — in both light and dark mode.
 *
 * A ```` ```chart ```` fence is lifted out of the bubble flow and rendered as
 * a standalone {@link ChatChart} on its own border, so a chart never wears
 * bubble chrome; prose on either side of it keeps its own bubble. A message is
 * thus a column of segments — a bubble, a chart, another bubble — split from
 * the source at chart-fence boundaries. While `streaming`, the trailing
 * segment pulses (`animate-pulse` on a bubble, a chart skeleton for an
 * in-flight fence) until the response settles.
 *
 * Memoized on its (shallow-equal) props, so a transcript's settled messages
 * skip re-rendering — and re-splitting and re-lexing — while only the
 * streaming message's `children` actually changes from chunk to chunk.
 */
export const ChatMessage = memo(function ChatMessage({
	type,
	timestamp,
	streaming,
	actions,
	className,
	children,
}: ChatMessageProps) {
	// Bubble side/color alone convey the speaker visually; a visually hidden
	// author label names it for assistive technology. System messages are status
	// lines, not an utterance; they get a plain "System" attribution.
	const resolvedType = type ?? 'assistant'

	const author =
		resolvedType === 'user' ? 'You said' : resolvedType === 'system' ? 'System' : 'Assistant said'

	// Split at chart-fence boundaries so charts render outside the bubble; the
	// common no-chart message stays a single prose bubble.
	const segments = useMemo(() => splitChatSegments(children), [children])

	const lastIndex = segments.length - 1

	return (
		<div data-slot="chat-message" data-type={resolvedType} className={cn(k({ type }), className)}>
			<span data-slot="chat-message-author" className="sr-only">
				{author}:{' '}
			</span>
			{segments.map((segment, index) => (
				<ChatSegmentView
					// biome-ignore lint/suspicious/noArrayIndexKey: segment position is the stable identity within a message
					key={index}
					segment={segment}
					type={type}
					// Non-first segments gap from the one above; the first sits flush.
					spacing={index > 0}
					// Only the trailing segment pulses / skeletons while streaming.
					streaming={streaming && index === lastIndex}
				/>
			))}
			{timestamp !== undefined && (
				<div data-slot="chat-message-timestamp" className={cn(k.timestamp)}>
					{timestamp}
				</div>
			)}
			{actions !== undefined && (
				<div data-slot="chat-message-actions" className={cn(k.actions)}>
					{actions}
				</div>
			)}
		</div>
	)
})

/** One message segment: a chart on its own border, or a prose bubble. @internal */
function ChatSegmentView({
	segment,
	type,
	spacing,
	streaming,
}: {
	segment: ChatSegment
	type: ChatMessageVariants['type']
	spacing: boolean
	streaming: boolean | undefined
}) {
	const gap = spacing ? 'mt-2' : undefined

	if (segment.kind === 'chart') {
		// An unterminated fence is an in-flight chart (skeleton while streaming);
		// a closed fence carries a complete spec.
		return (
			<ChatChart code={segment.code} streaming={streaming && !segment.closed} className={gap} />
		)
	}

	return (
		<div data-slot="chat-message-bubble" className={cn(k.bubble({ type }), gap)}>
			<Markdown className={streaming ? 'animate-pulse' : ''}>{segment.content}</Markdown>
		</div>
	)
}
