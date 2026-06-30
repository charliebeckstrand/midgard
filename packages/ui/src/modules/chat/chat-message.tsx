import { memo, type ReactNode } from 'react'
import { Markdown } from '../../components/markdown'
import { ShinyText } from '../../components/shiny-text'
import { cn } from '../../core'
import { type ChatMessageVariants, k } from '../../recipes/kata/chat-message'

// Markdown's own palette (muted body text, zinc-950/white headings, blue
// links) is tuned for a page/card surface, where the body and the emphasis
// elements are meant to read as two different weights. A bubble already
// carries its *one* intended foreground per type (white on the user bubble's
// blue fill, zinc-950/white "default" on the assistant bubble, muted zinc on
// the system bubble) — Markdown's muted body would otherwise read fainter
// than the bubble's own (unstyled) text always did, and the user bubble's
// blue link would nearly vanish against its blue fill. Forcing every element
// to inherit the bubble's own foreground keeps a message's color uniform,
// matching what plain (pre-Markdown) bubble text looked like.
const BUBBLE_PROSE_CLASS = 'text-inherit [&_*]:text-inherit'

/** Props for {@link ChatMessage}. */
export type ChatMessageProps = ChatMessageVariants & {
	/** Wall-clock label shown below the bubble. */
	timestamp?: ReactNode
	/** Sweeps a ShinyText shimmer across the bubble content for streaming responses. */
	streaming?: boolean
	/** Action rail below the bubble (copy, retry, edit, …). */
	actions?: ReactNode
	className?: string
	/** Message text. Renders as Markdown once settled — see {@link ChatMessageProps.streaming}. */
	children: string
}

/**
 * Conversational message bubble sided and colored by `type` (`user`,
 * `assistant`, or `system`; defaults to `assistant`), with an optional
 * `timestamp`, `actions` rail, and a `streaming` ShinyText shimmer over its
 * content.
 *
 * @remarks
 * Side and color alone convey the speaker visually, so a visually hidden author
 * label ("You said", "Assistant said", or "System") announces it to assistive
 * tech.
 *
 * Settled content renders as GitHub-flavored Markdown ({@link Markdown},
 * complete with syntax-highlighted code fences), its prose colors overridden
 * to inherit the bubble's own foreground — Markdown's default palette is
 * tuned for a page surface, not a chat bubble, and would otherwise mute body
 * text and clash on the user bubble's blue fill. While `streaming`, content
 * stays raw text under the {@link ShinyText} shimmer instead — Markdown's
 * per-element colors would fight the shimmer's gradient clip, and re-lexing
 * on every streamed chunk is wasted work besides — snapping to formatted
 * Markdown the moment streaming ends.
 *
 * Memoized on its (shallow-equal) props, so a transcript's already-settled
 * bubbles skip re-rendering — and re-lexing their Markdown — while only the
 * streaming bubble's `children` actually changes from chunk to chunk.
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

	return (
		<div data-slot="chat-message" data-type={resolvedType} className={cn(k({ type }), className)}>
			<div data-slot="chat-message-bubble" className={cn(k.bubble({ type }))}>
				<span data-slot="chat-message-author" className="sr-only">
					{author}:{' '}
				</span>
				{streaming ? (
					<ShinyText>{children}</ShinyText>
				) : (
					<Markdown className={BUBBLE_PROSE_CLASS}>{children}</Markdown>
				)}
			</div>
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
