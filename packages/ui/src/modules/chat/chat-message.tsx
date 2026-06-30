import { memo, type ReactNode } from 'react'
import { Markdown } from '../../components/markdown'
import { ShinyText } from '../../components/shiny-text'
import { cn } from '../../core'
import { type ChatMessageVariants, k } from '../../recipes/kata/chat-message'

// Markdown's per-element prose colors (`recipes/kata/markdown.ts`) are tuned
// for a page/card surface, where the muted body and the emphasis elements
// read as two different weights. A bubble carries its *one* intended
// foreground per type instead (white on the user bubble's blue fill,
// zinc-950/white on the assistant bubble, muted zinc on the system bubble),
// so every Markdown element needs to inherit it. `root`'s own color is
// cancelled by pairing the unscoped and `dark:` variants in one className —
// tailwind-merge only dedupes same-variant classes, so the unscoped half
// alone leaves `dark:text-zinc-400` in place and dark-mode bubbles stay
// muted. The remaining elements that set their own color (headings, strong,
// links, blockquote, table headers) are separate nodes tailwind-merge can't
// reach; each selector below pairs a class with that tag name, so it outranks
// the plain utility class already on the element (one more specificity rung)
// regardless of light/dark mode or stylesheet order, without touching
// CodeBlock's syntax-highlighted spans (never named here). Every class is
// spelled out as a literal — Tailwind's scanner matches complete strings in
// source text, so a templated `` `[&_${tag}]:text-inherit` `` (built from an
// array of tag names) is invisible to it and silently emits no CSS at all.
const BUBBLE_PROSE_CLASS = [
	'text-inherit',
	'dark:text-inherit',
	'[&_h1]:text-inherit',
	'[&_h2]:text-inherit',
	'[&_h3]:text-inherit',
	'[&_h4]:text-inherit',
	'[&_h5]:text-inherit',
	'[&_h6]:text-inherit',
	'[&_strong]:text-inherit',
	'[&_a]:text-inherit',
	'[&_blockquote]:text-inherit',
	'[&_th]:text-inherit',
].join(' ')

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
