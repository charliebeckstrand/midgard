'use client'

import { cn } from '../../core'
import { k } from '../../recipes/kata/chat-message'
import { type ChatEmbedRenderer, useChatEmbeds } from './context'
import type { ChatEmbedPart } from './engine/chat-content/types'

/**
 * The line a block draws when no renderer claims its name. It names the block,
 * because the name is the one fact both the reader and the developer can act
 * on: one can say what is missing, the other can register it.
 *
 * @internal
 */
const statedFallback: ChatEmbedRenderer = (part) => (
	<span data-slot="chat-embed-fallback" className={cn(k.embedFallback)}>
		This chat cannot show a “{part.name}” block.
	</span>
)

/** Props for {@link ChatEmbed}. @internal */
export type ChatEmbedProps = {
	/** The block to draw. Its `name` selects the renderer. */
	part: ChatEmbedPart
	className?: string
}

/**
 * Draws one `embed` block through the renderer registered for its name.
 *
 * @remarks
 * Registered under the name, the caller's renderer draws it. Registered under
 * no name — including a transcript with no {@link ChatEmbedProvider} above it
 * at all — a stated fallback draws instead, so a reader is told the block is
 * there. A provider's own `fallback` replaces the module's line.
 *
 * @internal
 */
export function ChatEmbed({ part, className }: ChatEmbedProps) {
	const { renderers, fallback } = useChatEmbeds()

	const render = renderers[part.name] ?? fallback ?? statedFallback

	return (
		<div data-slot="chat-embed" data-embed={part.name} className={cn(k.embed, className)}>
			{render(part)}
		</div>
	)
}
