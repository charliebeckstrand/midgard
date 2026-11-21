'use client'

import { type ReactNode, useMemo } from 'react'
import { ChatCitationContext, type ChatCitationScope, useChatCitations } from './context'
import type { ChatCitation } from './engine/chat-content/types'
import type { ChatCitationTargets } from './types'

/** Props for {@link ChatCitationProvider}. */
export type ChatCitationProviderProps = {
	/**
	 * The views that a citation can select in, by `target`. A citation whose
	 * `target` is absent here renders as the prose that holds it, with no
	 * control. Hoist it out of the render, as a module constant or a `useMemo`.
	 */
	targets: ChatCitationTargets
	/** The active citation, or `null`. The app holds it, because the selection belongs to the view. */
	cited: ChatCitation | null
	/**
	 * Called with the citation that a reader pressed, or with `null` when the
	 * reader pressed the active citation again.
	 */
	onCite: (citation: ChatCitation | null) => void
	/**
	 * Tells if the selection of a view matches a citation, such as a bar that
	 * a reader picked in a chart that the citation also selects in. Each piece
	 * of a matched citation takes the marked look, and its description says
	 * that the selection matches it. The app makes the test, because only the
	 * app knows how a `selector` and the selection of its view relate. Use
	 * `useCallback`, because a new function draws each citation again.
	 * Without it, no citation is marked.
	 */
	isMarked?: (citation: ChatCitation) => boolean
	/** The subtree whose transcripts draw the citations. */
	children: ReactNode
}

/**
 * The views that a citation in a transcript below it can select in, and the
 * active citation.
 *
 * @remarks
 * A citation is a phrase of a reply, such as "twelve stops are late", that
 * selects something in a view beside the chat. The phrase draws as a toggle
 * button. A press calls `onCite`, and the app derives the selection prop of
 * each view from `cited`. An adapter such as {@link toCategorySelection},
 * {@link toRegionSelection}, or {@link toStopSelection} reads
 * the `selector` of the citation for one kind of view.
 *
 * Controlled, because the selection belongs to the dashboard and not to the
 * chat. The provider holds no state. The anchor reads `cited` to show whether
 * it is pressed, and it compares the citation by `id`.
 *
 * In a dashboard, a citation marks and does not filter. A cross-filter
 * selection from outside a tile filters each tile, so do not write `cited`
 * into the selections of the board. Give `cited` to the tiles in a context of
 * the app, and let each tile derive its selection prop from it. Show one
 * selection at a time: in `onCite`, clear the selections of the board, and
 * when a reader picks in a tile, clear `cited`. Thus a tile never marks a
 * citation while a filter that it does not show applies.
 *
 * The reverse direction is `isMarked`: a pick in a view marks each citation
 * that the pick matches. A marked citation is not pressed. A press makes it
 * the active citation, and the board then shows the selection of the citation
 * in place of the pick.
 *
 * Nesting merges `targets`, as {@link ChatEmbedProvider} merges `renderers`.
 * The inner provider wins on a target that both name. Its `cited` and
 * `onCite` replace those of the outer provider. Its `isMarked` replaces the
 * outer one only when it gives one.
 *
 * @example
 *   const targets = { 'late-by-day': { label: 'Late stops by day' } }
 *
 *   const [cited, setCited] = useState<ChatCitation | null>(null)
 *
 *   <ChatCitationProvider targets={targets} cited={cited} onCite={setCited}>
 *     <ChatTranscript messages={messages} />
 *   </ChatCitationProvider>
 *   <BarChart
 *     selectedCategories={cited?.target === 'late-by-day' ? toCategorySelection(cited.selector) : undefined}
 *   />
 */
export function ChatCitationProvider({
	targets,
	cited,
	onCite,
	isMarked,
	children,
}: ChatCitationProviderProps) {
	const outer = useChatCitations()

	const value = useMemo<ChatCitationScope>(
		() => ({
			targets: { ...outer.targets, ...targets },
			cited,
			onCite,
			isMarked: isMarked ?? outer.isMarked,
		}),
		[outer.targets, outer.isMarked, targets, cited, onCite, isMarked],
	)

	return <ChatCitationContext value={value}>{children}</ChatCitationContext>
}
