'use client'

import { type ReactNode, useMemo } from 'react'
import { ChatEmbedContext, type ChatEmbedRegistry, useChatEmbeds } from './context'

/** Props for {@link ChatEmbedProvider}. */
export type ChatEmbedProviderProps = ChatEmbedRegistry & {
	children: ReactNode
}

/**
 * Registers the renderers a transcript below it draws an `embed` part with, by
 * name.
 *
 * @remarks
 * This is the seam that keeps a chart, a grid, and a map out of the chat. The
 * module imports none of them: a message names a renderer, and the app that
 * wants one wires it here, so a chat with no embed pays for none of the three
 * heaviest modules in the package. It is the discipline the map module holds
 * when it takes its atlas as a prop and ships no geometry.
 *
 * A name no renderer claims draws a stated fallback rather than nothing —
 * the module's own line, or the `fallback` set here. A reader is told the block
 * is there either way, because a silent gap reads as a reply that stopped.
 *
 * Nesting merges rather than replaces: an inner provider adds its renderers to
 * an outer provider's and wins on a name they share, and its `fallback` stands
 * in only where it sets one. A second entry point can then ship the adapters
 * for the three modules while an app adds one embed of its own around them.
 *
 * Hoist `renderers` out of the render, as a module constant or a `useMemo`. A
 * fresh object each render is a fresh registry, which re-renders every bubble
 * that reads it.
 *
 * @example
 *   const renderers = { revenue: (part) => <BarChart {...(part.data as RevenueData)} /> }
 *
 *   <ChatEmbedProvider renderers={renderers}>
 *     <ChatTranscript messages={messages} />
 *   </ChatEmbedProvider>
 */
export function ChatEmbedProvider({
	renderers,
	fallback,
	mount,
	children,
}: ChatEmbedProviderProps) {
	const outer = useChatEmbeds()

	const value = useMemo<ChatEmbedRegistry>(
		() => ({
			renderers: { ...outer.renderers, ...renderers },
			fallback: fallback ?? outer.fallback,
			mount: mount ?? outer.mount,
		}),
		[outer, renderers, fallback, mount],
	)

	return <ChatEmbedContext value={value}>{children}</ChatEmbedContext>
}
