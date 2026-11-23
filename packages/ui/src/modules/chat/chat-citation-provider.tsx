'use client'

import { type ReactNode, useMemo } from 'react'
import { useDevWarning } from '../../hooks/use-dev-warning'
import { ChatCitationContext, type ChatCitationScope, useChatCitations } from './context'
import type { ChatCitation } from './engine/chat-content/types'
import type { ChatCitationTargets } from './types'
import {
	type ChatCitationTrigger,
	toCitationMode,
	useChatCitationTrigger,
} from './use-chat-citation-trigger'

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
	 * Fires when a press changes the active citation, with the next value of
	 * `cited`: the pressed citation, or `null` when the reader pressed the
	 * active citation again. Escape on a citation sends `null`, as the Clear
	 * control of a view does. A hover never calls it.
	 */
	onCitedChange: (citation: ChatCitation | null) => void
	/**
	 * Fires when a hover or a keyboard focus starts a preview, with the
	 * previewed citation, and with `null` when the preview ends or its citation
	 * unmounts. Draw each view
	 * from `previewed ?? cited`, so a preview shows over the active citation and
	 * the active citation comes back when the preview ends. The preview does
	 * not change `cited`, so a control that clears `cited`, such as a Clear
	 * button of a view, reads `cited` alone.
	 *
	 * A trigger with `'hover'` needs it. Without it, a hover shows nothing, and
	 * the provider warns in development.
	 */
	onPreviewChange?: (citation: ChatCitation | null) => void
	/**
	 * The inputs that show a citation: one input, or a list of them. `'click'`
	 * toggles `cited` on a press. `'hover'` previews the citation through
	 * `onPreviewChange` while the pointer or the keyboard focus is on it, and a
	 * click does nothing. `['hover', 'click']` previews on a hover or a focus,
	 * and a press toggles `cited`. The order of the list does not matter.
	 *
	 * @remarks
	 * A focus from the keyboard previews, as a hover does. A blur ends the
	 * preview. Escape on a citation ends a preview and clears `cited`, in each
	 * mode. With nothing to clear, Escape goes on to the surface that holds the
	 * chat. The focus that a click gives does not preview. A tap, Enter, and
	 * Space cannot hover, so they toggle `cited` in each mode. A citation is a
	 * toggle button, so a press from the keyboard changes it (WCAG 4.1.2).
	 *
	 * @defaultValue `'click'`, or the trigger of the enclosing provider.
	 */
	trigger?: ChatCitationTrigger
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
 * button. A press calls `onCitedChange`, and the app derives the selection prop of
 * each view from `cited`. An adapter such as {@link toCategorySelection},
 * {@link toRegionSelection}, or {@link toStopSelection} reads
 * the `selector` of the citation for one kind of view.
 *
 * Controlled, because the selection belongs to the dashboard and not to the
 * chat. The provider holds no state but the inputs that hold a preview. The
 * app holds the preview too, from `onPreviewChange`. The anchor reads `cited` to show whether
 * it is pressed, and it compares the citation by `id`.
 *
 * In a dashboard, a citation marks and does not filter. A cross-filter
 * selection from outside a tile filters each tile, so do not write `cited`
 * into the selections of the board. Give `cited` to the tiles in a context of
 * the app, and let each tile derive its selection prop from it. Show one
 * selection at a time: in `onCitedChange`, clear the selections of the board, and
 * when a reader picks in a tile, clear `cited`. Thus a tile never marks a
 * citation while a filter that it does not show applies.
 *
 * The reverse direction is `isMarked`: a pick in a view marks each citation
 * that the pick matches. A marked citation is not pressed. A press makes it
 * the active citation, and the board then shows the selection of the citation
 * in place of the pick.
 *
 * Nesting merges `targets`, as {@link ChatEmbedProvider} merges `renderers`.
 * The inner provider wins on a target that both name. Its `cited`,
 * `onCitedChange`, and `onPreviewChange` replace those of the outer provider. Its `isMarked` and its
 * `trigger` replace the outer ones only when it gives them.
 *
 * @example
 *   const targets = { 'late-by-day': { label: 'Late stops by day' } }
 *
 *   const [cited, setCited] = useState<ChatCitation | null>(null)
 *
 *   <ChatCitationProvider targets={targets} cited={cited} onCitedChange={setCited}>
 *     <ChatTranscript messages={messages} />
 *   </ChatCitationProvider>
 *   <BarChart
 *     selectedCategories={cited?.target === 'late-by-day' ? toCategorySelection(cited.selector) : undefined}
 *   />
 */
export function ChatCitationProvider({
	targets,
	cited,
	onCitedChange,
	onPreviewChange,
	isMarked,
	trigger,
	children,
}: ChatCitationProviderProps) {
	const outer = useChatCitations()

	const mode = trigger === undefined ? (outer.trigger ?? 'click') : toCitationMode(trigger)

	const actions = useChatCitationTrigger(mode, cited, onCitedChange, onPreviewChange)

	useDevWarning(
		mode !== 'click' && onPreviewChange === undefined,
		'ChatCitationProvider: a `hover` trigger needs `onPreviewChange`, so a hover shows nothing.',
	)

	const value = useMemo<ChatCitationScope>(
		() => ({
			targets: { ...outer.targets, ...targets },
			cited,
			isMarked: isMarked ?? outer.isMarked,
			trigger: mode,
			actions,
		}),
		[outer.targets, outer.isMarked, targets, cited, isMarked, mode, actions],
	)

	return <ChatCitationContext value={value}>{children}</ChatCitationContext>
}
