'use client'

import { type ReactNode, useCallback, useMemo, useState } from 'react'
import { useDevWarning } from '../../hooks/use-dev-warning'
import { ChatCitationPanel } from './chat-citation-panel'
import { ChatCitationContext, type ChatCitationScope, useChatCitations } from './context'
import type { ChatCitation } from './engine/chat-content/types'
import type { ChatCitationTargets } from './types'
import {
	type ChatCitationTrigger,
	toCitationMode,
	useChatCitationTrigger,
} from './use-chat-citation-trigger'

/**
 * The props of {@link ChatCitationProvider} that select in a view beside the
 * chat. A provider whose targets all have `render` can leave them out. It then
 * takes them from the enclosing provider.
 */
type ChatCitationSelectProps = {
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
	 * chat. The focus that a click gives does not preview. A tap, Enter, Space,
	 * and a click from assistive technology cannot hover, so they toggle `cited`
	 * in each mode. A citation is a
	 * toggle button, so a press from the keyboard changes it (WCAG 4.1.2).
	 *
	 * @defaultValue `'click'`, or the trigger of the enclosing provider.
	 */
	trigger?: ChatCitationTrigger
}

/** Props for {@link ChatCitationProvider}. */
export type ChatCitationProviderProps = {
	/**
	 * The views that a citation can show, by `target`. A citation whose
	 * `target` is absent here renders as the prose that holds it, with no
	 * control. A target with `render` opens its view in a panel. A target
	 * without it selects in a view beside the chat, through `cited`. Hoist it
	 * out of the render, as a module constant or a `useMemo`.
	 */
	targets: ChatCitationTargets
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
} & (ChatCitationSelectProps | { [Key in keyof ChatCitationSelectProps]?: never })

/**
 * The views that a citation in a transcript below it can show, and the active
 * citation.
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
 * chat. Of the selection, the provider holds only the inputs that hold a preview. The
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
 * A target with `render` is a view that the chat shows. A press on its
 * citation opens a panel over the page: a Dialog, or a Drawer on a phone. The
 * label of the target is the title of the panel, and `render` draws the view
 * from the citation, such as a chart of the data that supports the phrase. The
 * chat holds the open state, because the panel belongs to the chat. The
 * citation is a button that opens a dialog, and not a toggle. A hover, a
 * focus, and Escape do nothing to it, so `cited` and the preview never hold
 * it. A provider whose targets all have `render` needs no `cited` and no
 * `onCitedChange`.
 *
 * Nesting merges `targets`, as {@link ChatEmbedProvider} merges `renderers`.
 * The inner provider wins on a target that both name. Its `cited`,
 * `onCitedChange`, `onPreviewChange`, and `trigger` replace those of the outer
 * provider when it gives `onCitedChange`. Without it, the inner provider keeps
 * those of the outer provider. Its `isMarked` replaces the outer one only when
 * it gives it. The nearest provider opens the panel of each citation below it.
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
 *
 * @example
 *   const targets = {
 *     'late-trend': {
 *       label: 'Late stops by day',
 *       render: (citation) => <BarChart data={(citation.selector as Trend).days} series={series} />,
 *     },
 *   }
 *
 *   <ChatCitationProvider targets={targets}>
 *     <ChatTranscript messages={messages} />
 *   </ChatCitationProvider>
 */
export function ChatCitationProvider({
	targets,
	isMarked,
	children,
	...select
}: ChatCitationProviderProps) {
	const outer = useChatCitations()

	const { cited = null, onCitedChange, onPreviewChange, trigger } = select

	// A provider that gives `onCitedChange` selects. One that does not keeps the
	// selection of the outer provider, and adds only its targets.
	const selects = onCitedChange !== undefined

	const mode = trigger === undefined ? (outer.trigger ?? 'click') : toCitationMode(trigger)

	const own = useChatCitationTrigger(mode, cited, onCitedChange ?? ignore, onPreviewChange)

	useDevWarning(
		selects && mode !== 'click' && onPreviewChange === undefined,
		'ChatCitationProvider: a `hover` trigger needs `onPreviewChange`, so a hover shows nothing.',
	)

	// The citation of the panel stays after the close, so that the panel keeps
	// its view while it leaves.
	const [panel, setPanel] = useState<{ citation: ChatCitation; open: boolean } | null>(null)

	const show = useCallback((citation: ChatCitation) => setPanel({ citation, open: true }), [])

	const setOpen = useCallback(
		(open: boolean) => setPanel((prev) => (prev === null ? null : { ...prev, open })),
		[],
	)

	const shown = panel?.open ? panel.citation.id : null

	const value = useMemo<ChatCitationScope>(
		() => ({
			targets: { ...outer.targets, ...targets },
			cited: selects ? cited : outer.cited,
			isMarked: isMarked ?? outer.isMarked,
			trigger: selects ? mode : outer.trigger,
			actions: selects ? own : outer.actions,
			show,
			shown,
		}),
		[
			outer.targets,
			outer.cited,
			outer.isMarked,
			outer.trigger,
			outer.actions,
			targets,
			selects,
			cited,
			isMarked,
			mode,
			own,
			show,
			shown,
		],
	)

	return (
		<ChatCitationContext value={value}>
			{children}
			{/* The panel mounts at the first open, so a chat with no panel citation pays for no panel. */}
			{panel === null ? null : (
				<ChatCitationPanel
					open={panel.open}
					onOpenChange={setOpen}
					citation={panel.citation}
					target={value.targets[panel.citation.target]}
				/>
			)}
		</ChatCitationContext>
	)
}

/** The `onCitedChange` of a provider that does not select. Its trigger is never used. @internal */
function ignore() {}
