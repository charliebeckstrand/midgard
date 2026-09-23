'use client'

import { cn } from '../../core'
import { useInView } from '../../hooks'
import { Hold, type Mount, useMountHold } from '../../primitives/mount'
import { k } from '../../recipes/kata/chat-message'
import { type ChatEmbedRenderer, useChatEmbeds } from './context'
import type { ChatEmbedPart } from './engine/chat-content/types'

/**
 * The space a held-back embed reserves, in pixels, when its part names no
 * height. A chart at the package's standard tier runs to about this, so a
 * transcript scrolled through settles rather than lurching at every block.
 *
 * @internal
 */
const DEFERRED_HEIGHT = 160

/**
 * The line a block draws when no renderer claims its name. It names the block,
 * because the name is the one fact both the reader and the developer can act
 * on. One can say what is missing, the other can register it.
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
 * no name, a stated fallback draws instead, so a reader is told the block is
 * there. That covers a transcript with no {@link ChatEmbedProvider} above it at
 * all. A provider's own `fallback` replaces the module's line.
 *
 * @internal
 */
export function ChatEmbed({ part, className }: ChatEmbedProps) {
	const { renderers, fallback, mount = 'lazy' } = useChatEmbeds()

	const render = renderers[part.name] ?? fallback ?? statedFallback

	// `always` pays the mount up front, so the view is live from the first render.
	// It takes no observer and no hold: a held view would sit hidden, with its
	// effects paused and no space reserved, until the reader reached it.
	if (mount === 'always') {
		return (
			<div data-slot="chat-embed" data-embed={part.name} className={cn(k.embed, className)}>
				{render(part)}
			</div>
		)
	}

	return <HeldChatEmbed part={part} className={className} mount={mount} render={render} />
}

/** Props for {@link HeldChatEmbed}. @internal */
type HeldChatEmbedProps = ChatEmbedProps & {
	/** The policy that holds the view: `lazy` or `active`. */
	mount: Exclude<Mount, 'always'>
	/** The renderer that draws the part. */
	render: ChatEmbedRenderer
}

/**
 * Draws one `embed` block behind the viewport gate. `lazy` mounts it near the
 * viewport and keeps it. `active` also unmounts it when it scrolls away.
 *
 * @internal
 */
function HeldChatEmbed({ part, className, mount, render }: HeldChatEmbedProps) {
	// `active` must see a block leave the viewport, so its observer stays
	// connected. `lazy` needs only the first sight.
	const { ref, inView } = useInView({ once: mount !== 'active' })

	const hold = useMountHold(inView, mount)

	return (
		<div
			ref={ref}
			data-slot="chat-embed"
			data-embed={part.name}
			// Reserved while the renderer is held back, so the transcript's height
			// does not jump as a reader scrolls into one. A caller that knows the
			// view's height says so on the part; this default is what a chart runs to.
			style={hold.present ? undefined : { minHeight: part.height ?? DEFERRED_HEIGHT }}
			data-deferred={hold.present ? undefined : ''}
			className={cn(k.embed, className)}
		>
			{hold.present && <Hold hold={hold}>{render(part)}</Hold>}
		</div>
	)
}
