'use client'

import { type ReactNode, useMemo, useState } from 'react'
import {
	ChatEmbedContext,
	type ChatEmbedRegistry,
	type ChatEmbedScope,
	useChatEmbeds,
} from './context'

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
 * module imports none of them. A message names a renderer, and the app that
 * wants one wires it here. A chat with no embed therefore pays for none of the
 * three heaviest modules in the package. It is the discipline the map module holds
 * when it takes its atlas as a prop and ships no geometry.
 *
 * A name no renderer claims draws a stated fallback rather than nothing —
 * the module's own line, or the `fallback` set here. A reader is told the block
 * is there either way, because a silent gap reads as a reply that stopped.
 *
 * Nesting merges rather than replaces. An inner provider adds its renderers to
 * an outer provider's, and wins on a name they share. Its `fallback` stands
 * in only where it sets one. A second entry point can then ship the adapters
 * for the three modules while an app adds one embed of its own around them.
 *
 * The provider also remembers each embed a reader has reached. A windowed
 * {@link ChatTranscript} unmounts a row that leaves its window, and the row's
 * own state goes with it. The memory lives here instead, so an embed whose row
 * returns draws at once and does not defer a second time. Nested providers
 * share the outermost memory.
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

	// One memory for the whole tree: a nested provider shares the outer set, so
	// an embed stays reached whichever provider is nearest to it.
	const [own] = useState(() => new Set<string>())

	const reached = outer.reached ?? own

	const value = useMemo<ChatEmbedScope>(
		() => ({
			renderers: { ...outer.renderers, ...renderers },
			fallback: fallback ?? outer.fallback,
			mount: mount ?? outer.mount,
			reached,
		}),
		[outer, renderers, fallback, mount, reached],
	)

	return <ChatEmbedContext value={value}>{children}</ChatEmbedContext>
}
