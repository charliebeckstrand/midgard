import { useState } from 'react'
import { renderToString } from 'react-dom/server'
import { beforeEach, describe, expect, it, vi } from 'vitest'
import {
	type ChatCitation,
	ChatCitationProvider,
	type ChatCitationTrigger,
	ChatMessage,
	type ChatPart,
	toCategorySelection,
	toRegionSelection,
	toStopSelection,
} from '../../modules/chat'
import { toCitationMode } from '../../modules/chat/use-chat-citation-trigger'
import { __resetLastInput } from '../../utilities/last-input'
import { NO_HOVER_QUERY, PHONE_QUERY } from '../../utilities/media-query'
import {
	act,
	allBySlot,
	ariaTarget,
	bySlot,
	renderUI,
	screen,
	stubMatchMedia,
	userEvent,
} from '../helpers'

// A citation that ends inside the bold draws as pieces: one for the text
// before the bold, and one in the bold.
const SOURCE = 'Twelve stops are late, most of them on **Tuesday morning**.'

/** A citation over the first occurrence of `quote` in {@link SOURCE}. */
function cite(id: string, quote: string, target = 'late-by-day'): ChatCitation {
	const start = SOURCE.indexOf(quote)

	return { id, start, end: start + quote.length, quote, target, selector: { categories: ['Tue'] } }
}

function reply(citations: ChatCitation[]): ChatPart[] {
	return [{ kind: 'text', id: 't1', text: SOURCE, citations }]
}

const targets = { 'late-by-day': { label: 'Late stops by day' } }

/** A provider that holds the active citation, as an app does. */
function Cited({
	citations,
	onCitedChange,
	onPreviewChange,
	trigger,
}: {
	citations: ChatCitation[]
	onCitedChange?: (c: ChatCitation | null) => void
	onPreviewChange?: (c: ChatCitation | null) => void
	trigger?: ChatCitationTrigger
}) {
	const [cited, setCited] = useState<ChatCitation | null>(null)

	return (
		<ChatCitationProvider
			targets={targets}
			trigger={trigger}
			cited={cited}
			onCitedChange={(citation) => {
				onCitedChange?.(citation)

				setCited(citation)
			}}
			onPreviewChange={onPreviewChange}
		>
			<ChatMessage sender="assistant" contextMenu={false}>
				{reply(citations)}
			</ChatMessage>
		</ChatCitationProvider>
	)
}

// Each message takes no menu, so each button that a case finds is a citation.

describe('ChatCitationProvider', () => {
	it('draws a citation as a toggle button named by its phrase and described by its view', () => {
		renderUI(<Cited citations={[cite('c1', 'Twelve stops are late')]} />)

		const anchor = screen.getByRole('button', { name: 'Twelve stops are late' })

		expect(anchor).toBeUnpressed()

		expect(anchor).toHaveAccessibleDescription('Selects in Late stops by day')
	})

	it('sends the citation on a press, and null on a second press', async () => {
		const onCitedChange = vi.fn()

		const user = userEvent.setup()

		renderUI(
			<Cited citations={[cite('c1', 'Twelve stops are late')]} onCitedChange={onCitedChange} />,
		)

		const anchor = screen.getByRole('button', { name: 'Twelve stops are late' })

		await user.click(anchor)

		expect(onCitedChange).toHaveBeenLastCalledWith(expect.objectContaining({ id: 'c1' }))

		expect(anchor).toBePressed()

		await user.click(anchor)

		expect(onCitedChange).toHaveBeenLastCalledWith(null)

		expect(anchor).toBeUnpressed()
	})

	it('presses from the keyboard as a native button does', async () => {
		const onCitedChange = vi.fn()

		const user = userEvent.setup()

		renderUI(
			<Cited citations={[cite('c1', 'Twelve stops are late')]} onCitedChange={onCitedChange} />,
		)

		const anchor = screen.getByRole('button', { name: 'Twelve stops are late' })

		// An inline span, so that the citation wraps with the prose.
		expect(anchor.tagName).toBe('SPAN')

		await user.tab()

		expect(anchor).toHaveFocus()

		await user.keyboard('{Enter}')

		expect(anchor).toBePressed()

		await user.keyboard(' ')

		expect(anchor).toBeUnpressed()

		expect(onCitedChange).toHaveBeenCalledTimes(2)
	})

	it('clears the active citation on Escape, and keeps the focus on the citation', async () => {
		const onCitedChange = vi.fn()

		const user = userEvent.setup()

		renderUI(
			<Cited
				citations={[cite('c1', 'Twelve stops are late'), cite('c2', 'on **Tuesday')]}
				onCitedChange={onCitedChange}
			/>,
		)

		const late = screen.getByRole('button', { name: 'Twelve stops are late' })

		const tuesday = screen.getByRole('button', { name: 'on Tuesday' })

		await user.click(late)

		// Escape on another citation clears the active one too.
		await user.tab()

		expect(tuesday).toHaveFocus()

		await user.keyboard('{Escape}')

		expect(onCitedChange).toHaveBeenLastCalledWith(null)

		expect(late).toBeUnpressed()

		expect(tuesday).toHaveFocus()
	})

	it('lets Escape go on to the surface that holds the chat when nothing is active', async () => {
		const onCitedChange = vi.fn()

		const onKeyDown = vi.fn((event: KeyboardEvent) => event.defaultPrevented)

		const user = userEvent.setup()

		renderUI(
			// biome-ignore lint/a11y/noStaticElementInteractions: the wrapper stands in for a dialog that reads Escape.
			<div onKeyDown={(event) => onKeyDown(event.nativeEvent)}>
				<Cited citations={[cite('c1', 'Twelve stops are late')]} onCitedChange={onCitedChange} />
			</div>,
		)

		await user.tab()

		await user.keyboard('{Escape}')

		expect(onCitedChange).not.toHaveBeenCalled()

		expect(onKeyDown).toHaveLastReturnedWith(false)

		await user.keyboard('{Enter}')

		onKeyDown.mockClear()

		await user.keyboard('{Escape}')

		// Escape cleared the citation, so the surface does not get it.
		expect(onKeyDown).not.toHaveBeenCalled()
	})

	it('draws one control for a citation that crosses bold, and marks each piece pressed', async () => {
		const user = userEvent.setup()

		const { container } = renderUI(<Cited citations={[cite('c1', 'most of them on **Tuesday')]} />)

		expect(screen.getAllByRole('button')).toHaveLength(1)

		// The control holds only the text before the bold, and its name is the whole phrase.
		expect(screen.getByRole('button')).toHaveTextContent(/^most of them on$/)

		expect(screen.getByRole('button')).toHaveAccessibleName('most of them on Tuesday')

		const [piece] = allBySlot(container, 'chat-citation-piece')

		expect(piece?.parentElement?.tagName).toBe('STRONG')

		// The name of the control holds the bold text, so browse mode does not read it again.
		expect(piece).toHaveAttribute('aria-hidden', 'true')

		await user.click(screen.getByRole('button'))

		expect(piece).toHaveAttribute('data-pressed')
	})

	it('draws a citation that holds whole bold as one control, with the bold in it', async () => {
		const source = 'Late stops rose from **4** to **14** this week.'

		const quote = '**4** to **14**'

		const start = source.indexOf(quote)

		const citation = { ...cite('c1', 'Twelve'), start, end: start + quote.length, quote }

		const user = userEvent.setup()

		const { container } = renderUI(
			<ChatCitationProvider targets={targets} cited={null} onCitedChange={() => {}}>
				<ChatMessage sender="assistant" contextMenu={false}>
					{[{ kind: 'text', id: 't1', text: source, citations: [citation] }]}
				</ChatMessage>
			</ChatCitationProvider>,
		)

		const anchor = screen.getByRole('button', { name: '4 to 14' })

		expect(anchor).toHaveTextContent(/^4 to 14$/)

		expect(anchor.querySelectorAll('strong')).toHaveLength(2)

		expect(allBySlot(container, 'chat-citation-piece')).toEqual([])

		await user.tab()

		expect(anchor).toHaveFocus()
	})

	it('presses a citation that crosses bold on a click of its bold piece', async () => {
		const user = userEvent.setup()

		const onCitedChange = vi.fn()

		const { container } = renderUI(
			<Cited citations={[cite('c1', 'most of them on **Tuesday')]} onCitedChange={onCitedChange} />,
		)

		const [piece] = allBySlot(container, 'chat-citation-piece')

		if (!piece) throw new Error('no piece')

		await user.click(piece)

		expect(onCitedChange).toHaveBeenLastCalledWith(expect.objectContaining({ id: 'c1' }))

		expect(screen.getByRole('button')).toBePressed()

		// A second click releases it, as a second press of piece 0 does.
		await user.click(piece)

		expect(onCitedChange).toHaveBeenLastCalledWith(null)
	})

	it('draws a citation whose target is not registered as static text, with no control', () => {
		const { container } = renderUI(
			<Cited citations={[cite('c1', 'Twelve stops are late', 'unknown')]} />,
		)

		expect(screen.queryByRole('button')).toBeNull()

		expect(bySlot(container, 'chat-citation-static')?.textContent).toBe('Twelve stops are late')

		expect(bySlot(container, 'markdown')?.textContent).toBe(
			'Twelve stops are late, most of them on Tuesday morning.',
		)
	})

	it('draws each piece of a citation with no provider as static text, with no control', () => {
		const { container } = renderUI(
			<ChatMessage sender="user" contextMenu={false}>
				{reply([cite('c1', 'most of them on **Tuesday')])}
			</ChatMessage>,
		)

		expect(screen.queryByRole('button')).toBeNull()

		expect(allBySlot(container, 'chat-citation-static').map((piece) => piece.textContent)).toEqual([
			'most of them on ',
			'Tuesday',
		])
	})

	it('keeps the description out of the name of the anchor and out of sight', () => {
		renderUI(<Cited citations={[cite('c1', 'Twelve stops are late')]} />)

		const anchor = screen.getByRole('button', { name: 'Twelve stops are late' })

		const description = ariaTarget(anchor, 'aria-describedby')

		expect(description).toHaveAttribute('hidden')

		expect(anchor.contains(description)).toBe(false)
	})

	it('merges the targets of a nested provider with those of the outer one', () => {
		renderUI(
			<ChatCitationProvider targets={targets} cited={null} onCitedChange={() => {}}>
				<ChatCitationProvider
					targets={{ other: { label: 'Other' } }}
					cited={null}
					onCitedChange={() => {}}
				>
					<ChatMessage sender="assistant" contextMenu={false}>
						{reply([cite('c1', 'Twelve stops are late'), cite('c2', 'Tuesday', 'other')])}
					</ChatMessage>
				</ChatCitationProvider>
			</ChatCitationProvider>,
		)

		expect(screen.getAllByRole('button')).toHaveLength(2)
	})
})

describe('ChatCitationProvider trigger', () => {
	const late = cite('late', 'Twelve stops are late')

	const tuesday = cite('tue', 'on **Tuesday')

	beforeEach(() => __resetLastInput())

	/** Moves a mouse from one node to the next. React makes enter and leave from over and out. */
	function move(from: Element, to: Element) {
		const init = { pointerType: 'mouse', bubbles: true }

		from.dispatchEvent(new PointerEvent('pointerout', { ...init, relatedTarget: to }))

		to.dispatchEvent(new PointerEvent('pointerover', { ...init, relatedTarget: from }))
	}

	function setup(trigger: ChatCitationTrigger, citations = [late, tuesday]) {
		const onCitedChange = vi.fn()

		const onPreviewChange = vi.fn()

		const user = userEvent.setup()

		const view = renderUI(
			<Cited
				citations={citations}
				onCitedChange={onCitedChange}
				onPreviewChange={onPreviewChange}
				trigger={trigger}
			/>,
		)

		const anchor = (name: string) => screen.getByRole('button', { name })

		/** The ids that `onPreviewChange` got, in order, with `null` for an end. */
		const previews = () => onPreviewChange.mock.calls.map(([citation]) => citation?.id ?? null)

		return { ...view, user, onCitedChange, onPreviewChange, previews, anchor }
	}

	it('previews a hover citation while the pointer is on it, and does not cite it', async () => {
		const { user, onCitedChange, previews, anchor } = setup('hover')

		await user.hover(anchor('Twelve stops are late'))

		expect(previews()).toEqual(['late'])

		expect(anchor('Twelve stops are late')).toBeUnpressed()

		await user.unhover(anchor('Twelve stops are late'))

		expect(previews()).toEqual(['late', null])

		expect(onCitedChange).not.toHaveBeenCalled()
	})

	it('does nothing on a click with a hover trigger', async () => {
		const { user, onCitedChange, anchor } = setup('hover')

		await user.click(anchor('Twelve stops are late'))

		expect(onCitedChange).not.toHaveBeenCalled()
	})

	it('toggles a hover citation on Enter and Space, as a key cannot hover', async () => {
		const { user, onCitedChange, anchor } = setup('hover')

		anchor('Twelve stops are late').focus()

		await user.keyboard('{Enter}')

		expect(onCitedChange).toHaveBeenLastCalledWith(expect.objectContaining({ id: 'late' }))

		expect(anchor('Twelve stops are late')).toBePressed()

		await user.keyboard(' ')

		expect(onCitedChange).toHaveBeenLastCalledWith(null)

		expect(anchor('Twelve stops are late')).toBeUnpressed()
	})

	it('previews on a keyboard focus, and ends the preview on blur and on Escape', async () => {
		const { user, previews } = setup('hover')

		await user.tab()

		await user.keyboard('{Escape}')

		expect(previews()).toEqual(['late', null])

		await user.tab()

		await user.tab()

		expect(previews()).toEqual(['late', null, 'tue', null])
	})

	it('toggles a hover citation on a tap, as a touch screen has no hover', async () => {
		const { user, onCitedChange, onPreviewChange, anchor } = setup('hover')

		await user.pointer({ keys: '[TouchA]', target: anchor('Twelve stops are late') })

		expect(onCitedChange).toHaveBeenCalledTimes(1)

		expect(onCitedChange).toHaveBeenLastCalledWith(expect.objectContaining({ id: 'late' }))

		expect(onPreviewChange).not.toHaveBeenCalled()

		expect(anchor('Twelve stops are late')).toBePressed()
	})

	it('toggles a hover citation on a click from assistive technology, as it cannot hover', async () => {
		const { user, onCitedChange, onPreviewChange, anchor } = setup('hover')

		// A mouse press first, so the last input is a pointer that can hover.
		await user.click(document.body)

		// A screen reader in browse mode sends a click with no press count.
		act(() => {
			anchor('Twelve stops are late').dispatchEvent(
				new MouseEvent('click', { bubbles: true, detail: 0 }),
			)
		})

		expect(onCitedChange).toHaveBeenLastCalledWith(expect.objectContaining({ id: 'late' }))

		expect(onPreviewChange).not.toHaveBeenCalled()
	})

	it('previews a hover and click citation on hover, and cites it on a click', async () => {
		const { user, onCitedChange, previews, anchor } = setup(['hover', 'click'])

		await user.hover(anchor('Twelve stops are late'))

		expect(anchor('Twelve stops are late')).toBeUnpressed()

		await user.click(anchor('Twelve stops are late'))

		expect(onCitedChange).toHaveBeenLastCalledWith(expect.objectContaining({ id: 'late' }))

		expect(anchor('Twelve stops are late')).toBePressed()

		await user.unhover(anchor('Twelve stops are late'))

		// The end of the preview leaves `cited` as it is.
		expect(previews()).toEqual(['late', null])

		expect(onCitedChange).toHaveBeenCalledTimes(1)

		// A second click releases it.
		await user.click(anchor('Twelve stops are late'))

		expect(onCitedChange).toHaveBeenLastCalledWith(null)
	})

	it('previews another citation over the cited one, and leaves `cited` as it is', async () => {
		const { user, onCitedChange, previews, anchor } = setup(['hover', 'click'])

		await user.click(anchor('Twelve stops are late'))

		await user.hover(anchor('on Tuesday'))

		await user.unhover(anchor('on Tuesday'))

		expect(previews()).toContain('tue')

		expect(previews().at(-1)).toBeNull()

		expect(onCitedChange).toHaveBeenCalledTimes(1)

		expect(anchor('Twelve stops are late')).toBePressed()
	})

	it('previews the next citation when the pointer moves from one to the next before a render', () => {
		const { previews, anchor } = setup(['hover', 'click'])

		const late = anchor('Twelve stops are late')

		const tue = anchor('on Tuesday')

		// One act holds the events, so no render comes between them.
		act(() => {
			move(document.body, tue)

			move(tue, late)
		})

		expect(previews()).toEqual(['tue', null, 'late'])
	})

	it('keeps the preview while the pointer moves to the bold piece of the citation', () => {
		const { previews, container } = setup(['hover', 'click'], [tuesday])

		const [anchor] = allBySlot(container, 'chat-citation')

		const [piece] = allBySlot(container, 'chat-citation-piece')

		if (!anchor || !piece) throw new Error('no pieces')

		// user-event gives no relatedTarget, and the piece reads it.
		act(() => move(document.body, anchor))

		act(() => move(anchor, piece))

		expect(previews()).toEqual(['tue'])

		act(() => move(piece, document.body))

		expect(previews()).toEqual(['tue', null])
	})

	it('keeps the preview while the pointer leaves a citation that has the keyboard focus', async () => {
		const { user, previews, anchor } = setup(['hover', 'click'])

		await user.tab()

		await user.hover(anchor('Twelve stops are late'))

		await user.unhover(anchor('Twelve stops are late'))

		expect(previews()).toEqual(['late'])

		await user.tab()

		expect(previews()).toEqual(['late', null, 'tue'])
	})

	it('ends the preview when the reply that holds the citation unmounts', async () => {
		const onPreviewChange = vi.fn()

		const user = userEvent.setup()

		const tree = (shown: boolean) => (
			<ChatCitationProvider
				targets={targets}
				cited={null}
				onCitedChange={() => {}}
				onPreviewChange={onPreviewChange}
				trigger="hover"
			>
				{shown ? (
					<ChatMessage sender="assistant" contextMenu={false}>
						{reply([late])}
					</ChatMessage>
				) : null}
			</ChatCitationProvider>
		)

		const { rerender } = renderUI(tree(true))

		await user.hover(screen.getByRole('button'))

		rerender(tree(false))

		expect(onPreviewChange.mock.calls.map(([c]) => c?.id ?? null)).toEqual(['late', null])
	})

	it('sends nothing when a citation with no preview unmounts', () => {
		const onPreviewChange = vi.fn()

		const tree = (shown: boolean) => (
			<ChatCitationProvider
				targets={targets}
				cited={null}
				onCitedChange={() => {}}
				onPreviewChange={onPreviewChange}
				trigger="hover"
			>
				{shown ? (
					<ChatMessage sender="assistant" contextMenu={false}>
						{reply([late])}
					</ChatMessage>
				) : null}
			</ChatCitationProvider>
		)

		const { rerender } = renderUI(tree(true))

		rerender(tree(false))

		expect(onPreviewChange).not.toHaveBeenCalled()
	})

	it('ends the preview and clears a hover and click citation on Escape', async () => {
		const { user, onCitedChange, previews, anchor } = setup(['hover', 'click'])

		await user.tab()

		await user.keyboard('{Enter}')

		expect(anchor('Twelve stops are late')).toBePressed()

		await user.keyboard('{Escape}')

		expect(previews()).toEqual(['late', null])

		expect(onCitedChange).toHaveBeenLastCalledWith(null)

		expect(anchor('Twelve stops are late')).toBeUnpressed()

		// The blur after Escape sends nothing, because no preview is open.
		await user.tab()

		expect(previews()).toEqual(['late', null, 'tue'])
	})

	it('cites a hover and click citation on Enter', async () => {
		const { user, onCitedChange, anchor } = setup(['hover', 'click'])

		await user.tab()

		await user.keyboard('{Enter}')

		await user.tab()

		expect(onCitedChange).toHaveBeenCalledTimes(1)

		expect(anchor('Twelve stops are late')).toBePressed()
	})

	it.each([
		['click', 'click'],
		['hover', 'hover'],
		[['click'], 'click'],
		[['hover'], 'hover'],
		[['hover', 'click'], 'hover-click'],
		[['click', 'hover'], 'hover-click'],
	] as const)('reads the trigger %j as the mode %s', (trigger, mode) => {
		expect(toCitationMode(trigger)).toBe(mode)
	})

	it('takes no hover with the click default', async () => {
		const { user, onPreviewChange, anchor } = setup('click')

		await user.hover(anchor('Twelve stops are late'))

		await user.tab()

		expect(onPreviewChange).not.toHaveBeenCalled()
	})

	it('warns in development when a hover trigger has no onPreviewChange', () => {
		const warn = vi.spyOn(console, 'warn').mockImplementation(() => {})

		renderUI(
			<ChatCitationProvider targets={targets} cited={null} onCitedChange={() => {}} trigger="hover">
				<ChatMessage sender="assistant" contextMenu={false}>
					{reply([late])}
				</ChatMessage>
			</ChatCitationProvider>,
		)

		expect(warn).toHaveBeenCalledWith(expect.stringContaining('onPreviewChange'))

		warn.mockRestore()
	})

	it('takes the trigger of the outer provider under an inner one that gives none', async () => {
		const onPreviewChange = vi.fn()

		const user = userEvent.setup()

		renderUI(
			<ChatCitationProvider
				targets={targets}
				cited={null}
				onCitedChange={() => {}}
				onPreviewChange={() => {}}
				trigger="hover"
			>
				<ChatCitationProvider
					targets={{}}
					cited={null}
					onCitedChange={() => {}}
					onPreviewChange={onPreviewChange}
				>
					<ChatMessage sender="assistant" contextMenu={false}>
						{reply([late])}
					</ChatMessage>
				</ChatCitationProvider>
			</ChatCitationProvider>,
		)

		await user.hover(screen.getByRole('button'))

		expect(onPreviewChange).toHaveBeenLastCalledWith(expect.objectContaining({ id: 'late' }))
	})
})

describe('ChatCitationProvider isMarked', () => {
	const late = cite('late', 'Twelve stops are late')

	const tuesday = cite('tue', 'on **Tuesday')

	const isTuesday = (citation: ChatCitation) => citation.id === 'tue'

	it('marks each piece of a citation that the selection matches, and no other', () => {
		const { container } = renderUI(
			<ChatCitationProvider
				targets={targets}
				cited={null}
				onCitedChange={() => {}}
				isMarked={isTuesday}
			>
				<ChatMessage sender="assistant" contextMenu={false}>
					{reply([late, tuesday])}
				</ChatMessage>
			</ChatCitationProvider>,
		)

		const anchor = screen.getByRole('button', { name: 'on Tuesday' })

		expect(anchor).toHaveAttribute('data-marked')

		// A marked citation is not pressed: a press makes it the active citation.
		expect(anchor).toBeUnpressed()

		expect(bySlot(container, 'chat-citation-piece')).toHaveAttribute('data-marked')

		expect(screen.getByRole('button', { name: 'Twelve stops are late' })).not.toHaveAttribute(
			'data-marked',
		)
	})

	it('says in the description that the selection matches the citation', () => {
		renderUI(
			<ChatCitationProvider
				targets={targets}
				cited={null}
				onCitedChange={() => {}}
				isMarked={isTuesday}
			>
				<ChatMessage sender="assistant" contextMenu={false}>
					{reply([late, tuesday])}
				</ChatMessage>
			</ChatCitationProvider>,
		)

		expect(screen.getByRole('button', { name: 'on Tuesday' })).toHaveAccessibleDescription(
			'Selects in Late stops by day. The selection in that view matches it.',
		)

		expect(
			screen.getByRole('button', { name: 'Twelve stops are late' }),
		).toHaveAccessibleDescription('Selects in Late stops by day')
	})

	it('marks nothing without isMarked', () => {
		const { container } = renderUI(<Cited citations={[late, tuesday]} />)

		expect(container.querySelector('[data-marked]')).toBeNull()
	})

	it('keeps the outer isMarked under an inner provider that gives none, and replaces it with one that does', () => {
		const inner = (isMarked?: (citation: ChatCitation) => boolean) => (
			<ChatCitationProvider
				targets={targets}
				cited={null}
				onCitedChange={() => {}}
				isMarked={isTuesday}
			>
				<ChatCitationProvider
					targets={{}}
					cited={null}
					onCitedChange={() => {}}
					isMarked={isMarked}
				>
					<ChatMessage sender="assistant" contextMenu={false}>
						{reply([late, tuesday])}
					</ChatMessage>
				</ChatCitationProvider>
			</ChatCitationProvider>
		)

		const { container, rerender } = renderUI(inner())

		expect(
			allBySlot(container, 'chat-citation').map((anchor) => anchor.hasAttribute('data-marked')),
		).toEqual([false, true])

		rerender(inner((citation) => citation.id === 'late'))

		expect(
			allBySlot(container, 'chat-citation').map((anchor) => anchor.hasAttribute('data-marked')),
		).toEqual([true, false])
	})
})

describe('ChatCitationProvider render', () => {
	const late = cite('late', 'Twelve stops are late', 'late-trend')

	const tuesday = cite('tue', 'on **Tuesday', 'late-trend')

	const render = vi.fn((citation: ChatCitation) => (
		<p data-testid="view">{`View of ${citation.id}`}</p>
	))

	const panels = { 'late-trend': { label: 'Late stops this week', render } }

	beforeEach(() => {
		render.mockClear()
	})

	function Panels({ citations }: { citations: ChatCitation[] }) {
		return (
			<ChatCitationProvider targets={panels}>
				<ChatMessage sender="assistant" contextMenu={false}>
					{reply(citations)}
				</ChatMessage>
			</ChatCitationProvider>
		)
	}

	it('draws a citation as a button that opens a dialog, described by its view', () => {
		renderUI(<Panels citations={[late]} />)

		const anchor = screen.getByRole('button', { name: 'Twelve stops are late' })

		expect(anchor).toHaveAttribute('aria-haspopup', 'dialog')

		expect(anchor).toBeCollapsed()

		// It opens a view and selects in none, so it is not a toggle.
		expect(anchor).not.toHaveAttribute('aria-pressed')

		expect(anchor).toHaveAccessibleDescription('Shows Late stops this week')

		// The panel mounts at the first open, so a closed chat draws no view.
		expect(render).not.toHaveBeenCalled()
	})

	it('opens a panel titled by the label, with the view of the citation, on a click', async () => {
		const user = userEvent.setup()

		renderUI(<Panels citations={[late]} />)

		const anchor = screen.getByRole('button', { name: 'Twelve stops are late' })

		await user.click(anchor)

		const dialog = await screen.findByRole('dialog', { name: 'Late stops this week' })

		expect(dialog).toContainElement(screen.getByTestId('view'))

		expect(screen.getByTestId('view')).toHaveTextContent('View of late')

		expect(render).toHaveBeenLastCalledWith(expect.objectContaining({ id: 'late' }))

		expect(anchor).toBeExpanded()
	})

	it('opens from Enter and Space, and gives the focus back to the citation on Escape', async () => {
		const user = userEvent.setup()

		renderUI(<Panels citations={[late]} />)

		const anchor = screen.getByRole('button', { name: 'Twelve stops are late' })

		await user.tab()

		expect(anchor).toHaveFocus()

		await user.keyboard('{Enter}')

		expect(await screen.findByRole('dialog')).toBeInTheDocument()

		await user.keyboard('{Escape}')

		await vi.waitFor(() => expect(screen.queryByRole('dialog')).toBeNull())

		expect(anchor).toHaveFocus()

		expect(anchor).toBeCollapsed()

		await user.keyboard(' ')

		expect(await screen.findByRole('dialog')).toBeInTheDocument()
	})

	it('opens on a click of a bold piece, and gives the focus to the citation', async () => {
		const user = userEvent.setup()

		const { container } = renderUI(<Panels citations={[tuesday]} />)

		const piece = bySlot(container, 'chat-citation-piece')

		expect(piece).toHaveAttribute('aria-hidden', 'true')

		await user.click(piece as HTMLElement)

		expect(await screen.findByRole('dialog')).toBeInTheDocument()

		expect(screen.getByTestId('view')).toHaveTextContent('View of tue')

		// The panel gives the focus back to the citation, and not to the page.
		await user.keyboard('{Escape}')

		await vi.waitFor(() => expect(screen.queryByRole('dialog')).toBeNull())

		expect(screen.getByRole('button', { name: 'on Tuesday' })).toHaveFocus()
	})

	it('does not preview on a hover, and Escape on the citation goes on', async () => {
		const onPreviewChange = vi.fn()

		const onCitedChange = vi.fn()

		const onKeyDown = vi.fn((event: KeyboardEvent) => event.defaultPrevented)

		const user = userEvent.setup()

		renderUI(
			// biome-ignore lint/a11y/noStaticElementInteractions: the wrapper stands in for a dialog that reads Escape.
			<div onKeyDown={(event) => onKeyDown(event.nativeEvent)}>
				<ChatCitationProvider
					targets={{ ...targets, ...panels }}
					trigger={['hover', 'click']}
					cited={null}
					onCitedChange={onCitedChange}
					onPreviewChange={onPreviewChange}
				>
					<ChatMessage sender="assistant" contextMenu={false}>
						{reply([late])}
					</ChatMessage>
				</ChatCitationProvider>
			</div>,
		)

		const anchor = screen.getByRole('button', { name: 'Twelve stops are late' })

		await user.hover(anchor)

		await user.tab()

		await user.keyboard('{Escape}')

		expect(onPreviewChange).not.toHaveBeenCalled()

		expect(onCitedChange).not.toHaveBeenCalled()

		expect(onKeyDown).toHaveLastReturnedWith(false)
	})

	it('opens a Dialog that is wide enough for a chart or a map', async () => {
		const user = userEvent.setup()

		renderUI(<Panels citations={[late]} />)

		await user.click(screen.getByRole('button', { name: 'Twelve stops are late' }))

		expect(bySlot(document.body, 'dialog')).toHaveRole('dialog')

		expect(bySlot(document.body, 'dialog')).toHaveClass('sm:max-w-4xl')

		expect(bySlot(document.body, 'drawer')).toBeNull()
	})

	it('opens a Drawer on a phone', async () => {
		stubMatchMedia((query) => query === NO_HOVER_QUERY || query === PHONE_QUERY)

		const user = userEvent.setup()

		renderUI(<Panels citations={[late]} />)

		await user.click(screen.getByRole('button', { name: 'Twelve stops are late' }))

		expect(await screen.findByRole('dialog', { name: 'Late stops this week' })).toBe(
			bySlot(document.body, 'drawer'),
		)

		expect(screen.getByTestId('view')).toHaveTextContent('View of late')
	})

	it('keeps the selection of the outer provider under a provider that only adds panels', async () => {
		const onCitedChange = vi.fn()

		const user = userEvent.setup()

		renderUI(
			<ChatCitationProvider targets={targets} cited={null} onCitedChange={onCitedChange}>
				<ChatCitationProvider targets={panels}>
					<ChatMessage sender="assistant" contextMenu={false}>
						{reply([late, cite('tue', 'on **Tuesday')])}
					</ChatMessage>
				</ChatCitationProvider>
			</ChatCitationProvider>,
		)

		await user.click(screen.getByRole('button', { name: 'on Tuesday' }))

		expect(onCitedChange).toHaveBeenLastCalledWith(expect.objectContaining({ id: 'tue' }))

		await user.click(screen.getByRole('button', { name: 'Twelve stops are late' }))

		expect(await screen.findByRole('dialog', { name: 'Late stops this week' })).toBeInTheDocument()

		expect(onCitedChange).toHaveBeenCalledTimes(1)
	})
})

describe('toCategorySelection', () => {
	it('reads the categories of a selector', () => {
		expect(toCategorySelection({ categories: ['Mon', 'Tue'] })).toEqual(['Mon', 'Tue'])
	})

	it('reads an empty list as a selection of nothing', () => {
		expect(toCategorySelection({ categories: [] })).toEqual([])
	})

	it.each([
		['null', null],
		['a string', 'Tue'],
		['no categories', { regions: ['north'] }],
		['a list with a number', { categories: ['Tue', 2] }],
		['categories that are not a list', { categories: 'Tue' }],
	])('gives undefined for %s', (_, selector) => {
		expect(toCategorySelection(selector)).toBeUndefined()
	})
})

describe('toRegionSelection', () => {
	it('reads the regions of a selector', () => {
		expect(toRegionSelection({ regions: ['Texas', 'Ohio'] })).toEqual(['Texas', 'Ohio'])
	})

	it.each([
		['null', null],
		['no regions', { categories: ['Tue'] }],
		['a list with a number', { regions: ['Texas', 48] }],
		['regions that are not a list', { regions: 'Texas' }],
	])('gives undefined for %s', (_, selector) => {
		expect(toRegionSelection(selector)).toBeUndefined()
	})
})

describe('toStopSelection', () => {
	const indexByKey = new Map([
		['plano', 0],
		['waco', 3],
	])

	const getIndex = (key: string) => indexByKey.get(key)

	it('gives each stop as the id of its set and its index in the points', () => {
		expect(toStopSelection({ stops: ['waco', 'plano'] }, 'stops', getIndex)).toEqual([
			{ id: 'stops', index: 3 },
			{ id: 'stops', index: 0 },
		])
	})

	it('drops a key that names no drawn stop', () => {
		expect(toStopSelection({ stops: ['plano', 'austin'] }, 'stops', getIndex)).toEqual([
			{ id: 'stops', index: 0 },
		])
	})

	it('reads an empty list as a selection of nothing', () => {
		expect(toStopSelection({ stops: [] }, 'stops', getIndex)).toEqual([])
	})

	it.each([
		['null', null],
		['no stops', { regions: ['Texas'] }],
		['a list with a number', { stops: ['plano', 0] }],
		['stops that are not a list', { stops: 'plano' }],
	])('gives undefined for %s', (_, selector) => {
		expect(toStopSelection(selector, 'stops', getIndex)).toBeUndefined()
	})
})

describe('ChatCitationPiece server markup', () => {
	it('names a citation that crosses bold by its whole phrase before hydration', () => {
		const html = renderToString(
			<ChatCitationProvider targets={targets} cited={null} onCitedChange={() => {}}>
				<ChatMessage sender="assistant" contextMenu={false}>
					{reply([cite('c1', 'most of them on **Tuesday')])}
				</ChatMessage>
			</ChatCitationProvider>,
		)

		expect(html).toContain('aria-label="most of them on Tuesday"')
	})
})
