'use client'

import { useEffect, useSyncExternalStore } from 'react'
import { cn } from '../../core'
import { useInView } from '../../hooks'
import { Hold, type Mount, useMountHold } from '../../primitives/mount'
import { k } from '../../recipes/kata/chat-message'
import { type ChatEmbedRenderer, useChatEmbeds, useChatRowKey } from './context'
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

/** A subscription that never fires, for a snapshot that changes only at hydration. */
const subscribeNothing = () => () => {}

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
 * Under `lazy`, the block defers once. When it first comes into view, the
 * provider records its address. A windowed transcript unmounts the row when it
 * leaves the window. When the row returns, the block draws at once rather than
 * through its reserved height again.
 *
 * @internal
 */
export function ChatEmbed({ part, className }: ChatEmbedProps) {
	const { renderers, fallback, mount = 'lazy', reached } = useChatEmbeds()

	const row = useChatRowKey()

	// The block's address in the transcript. A part id is unique only in its
	// message, so the row key comes first. Outside a transcript there is no row
	// and no address, and the block keeps no memory across a remount.
	const address = row === undefined ? undefined : `${row}\u0000${part.id}`

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

	return (
		<HeldChatEmbed
			part={part}
			className={className}
			mount={mount}
			render={render}
			address={address}
			reached={reached}
		/>
	)
}

/** Props for {@link HeldChatEmbed}. @internal */
type HeldChatEmbedProps = ChatEmbedProps & {
	/** The policy that holds the view: `lazy` or `active`. */
	mount: Exclude<Mount, 'always'>
	/** The renderer that draws the part. */
	render: ChatEmbedRenderer
	/** The block's address in the transcript. Absent outside a transcript row. */
	address?: string
	/** The provider's set of reached addresses. Absent with no provider above. */
	reached?: Set<string>
}

/**
 * Draws one `embed` block behind the viewport gate. `lazy` mounts it near the
 * viewport and keeps it. `active` also unmounts it when it scrolls away.
 *
 * @remarks
 * The server and the hydration render show the reserved space. An observer
 * cannot run on the server, and the client must hydrate the same markup. The
 * gate therefore opens only after hydration.
 *
 * @internal
 */
function HeldChatEmbed({ part, className, mount, render, address, reached }: HeldChatEmbedProps) {
	// `active` must see a block leave the viewport, so its observer stays
	// connected. `lazy` needs only the first sight.
	const { ref, inView } = useInView({ once: mount !== 'active' })

	// Under `lazy`, a block the reader reached before is active on its first
	// render. Its row left the window and came back, and it must not defer again.
	const returning = mount === 'lazy' && address !== undefined && reached?.has(address) === true

	const hydrated = useSyncExternalStore(
		subscribeNothing,
		() => true,
		() => false,
	)

	const hold = useMountHold(hydrated && (inView || returning), mount)

	// Written after the commit, so a render that React discards records nothing.
	useEffect(() => {
		if (inView && address !== undefined) reached?.add(address)
	}, [inView, address, reached])

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
