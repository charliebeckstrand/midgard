'use client'

import { useInView } from 'motion/react'
import { useEffect, useRef } from 'react'
import { Placeholder } from '../../components/placeholder'
import { cn } from '../../core'
import { useHydrated } from '../../hooks/use-hydrated'
import { defineMessages } from '../../primitives/intl/intl-messages'
import { useIntl } from '../../primitives/intl/use-intl'
import { type Mount, MountHold, useMountHold } from '../../primitives/mount'
import { k } from '../../recipes/kata/chat-message'
import { useChatEmbeds, useChatRowKey } from './context'
import type { ChatEmbedPart } from './engine/chat-content/types'
import type { ChatEmbedRenderer } from './types'

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
const statedFallback: ChatEmbedRenderer = (part) => <ChatEmbedMissing name={part.name} />

const messages = defineMessages<{ missing: { name: string } }>({
	missing: {
		id: 'ui.chat.missing',
		defaultMessage: 'This chat cannot show a “{name}” block.',
		description:
			'Shown in place of a block of a chat reply that the app cannot draw. The name is the name of the block.',
	},
})

// The line of the fallback, in the language of the reader.
function ChatEmbedMissing({ name }: { name: string }) {
	const intl = useIntl()

	return (
		<span data-slot="chat-embed-fallback" className={k().embed.fallback}>
			{intl.formatMessage(messages.missing, { name })}
		</span>
	)
}

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
 * provider records its address. The module's stated fallback does not defer
 * under any policy, because it is one line of text. A windowed transcript unmounts the row when it
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

	// The registry is a plain object. The own-key test stops an inherited name,
	// such as `toString`, from reading as a renderer.
	const render =
		(Object.hasOwn(renderers, part.name) ? renderers[part.name] : undefined) ??
		fallback ??
		statedFallback

	// `always` pays the mount up front, so the view is live from the first render.
	// It takes no observer and no hold: a held view would sit hidden, with its
	// effects paused and no space reserved, until the reader reached it. The
	// stated fallback is one line of text with nothing to hold back. Its
	// placeholder would only collapse to the line and move the transcript.
	if (mount === 'always' || render === statedFallback) {
		return (
			<div data-slot="chat-embed" data-embed={part.name} className={cn(k().embed.base, className)}>
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
 * The server and the hydration render show a placeholder in the reserved
 * space. An observer cannot run on the server, and the client must hydrate
 * the same markup. The gate therefore opens only after hydration.
 *
 * @internal
 */
function HeldChatEmbed({ part, className, mount, render, address, reached }: HeldChatEmbedProps) {
	const ref = useRef<HTMLDivElement>(null)

	// `active` must see a block leave the viewport, so its observer stays
	// connected. `lazy` needs only the first sight. The margin prepares a block
	// just before the reader reaches it.
	const inView = useInView(ref, { margin: '200px', once: mount !== 'active' })

	// Under `lazy`, a block the reader reached before is active on its first
	// render. Its row left the window and came back, and it must not defer again.
	const returning = mount === 'lazy' && address !== undefined && reached?.has(address) === true

	const hydrated = useHydrated()

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
			data-deferred={hold.present ? undefined : ''}
			className={cn(k().embed.base, className)}
		>
			{hold.present ? (
				<MountHold hold={hold}>{render(part)}</MountHold>
			) : (
				// The placeholder holds the space while the renderer is held back, so the
				// transcript's height does not jump as a reader scrolls into one. A caller
				// that knows the view's height says so on the part; this default is what
				// a chart runs to.
				<Placeholder
					className={k().embed.placeholder}
					style={{ height: part.height ?? DEFERRED_HEIGHT }}
				/>
			)}
		</div>
	)
}
