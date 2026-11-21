import { useState } from 'react'
import { describe, expect, it, vi } from 'vitest'
import {
	type ChatCitation,
	ChatCitationProvider,
	ChatMessage,
	type ChatPart,
	toCategorySelection,
	toRegionSelection,
	toStopSelection,
} from '../../modules/chat'
import { allBySlot, bySlot, renderUI, screen, userEvent } from '../helpers'

const SOURCE = 'Twelve stops are late, most of them on **Tuesday**.'

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
	onCite,
}: {
	citations: ChatCitation[]
	onCite?: (c: ChatCitation | null) => void
}) {
	const [cited, setCited] = useState<ChatCitation | null>(null)

	return (
		<ChatCitationProvider
			targets={targets}
			cited={cited}
			onCite={(citation) => {
				onCite?.(citation)

				setCited(citation)
			}}
		>
			<ChatMessage sender="assistant">{reply(citations)}</ChatMessage>
		</ChatCitationProvider>
	)
}

describe('ChatCitationProvider', () => {
	it('draws a citation as a toggle button named by its phrase and described by its view', () => {
		renderUI(<Cited citations={[cite('c1', 'Twelve stops are late')]} />)

		const anchor = screen.getByRole('button', { name: 'Twelve stops are late' })

		expect(anchor).toHaveAttribute('aria-pressed', 'false')

		expect(anchor).toHaveAccessibleDescription('Selects in Late stops by day')
	})

	it('sends the citation on a press, and null on a second press', async () => {
		const onCite = vi.fn()

		const user = userEvent.setup()

		renderUI(<Cited citations={[cite('c1', 'Twelve stops are late')]} onCite={onCite} />)

		const anchor = screen.getByRole('button', { name: 'Twelve stops are late' })

		await user.click(anchor)

		expect(onCite).toHaveBeenLastCalledWith(expect.objectContaining({ id: 'c1' }))

		expect(anchor).toHaveAttribute('aria-pressed', 'true')

		await user.click(anchor)

		expect(onCite).toHaveBeenLastCalledWith(null)

		expect(anchor).toHaveAttribute('aria-pressed', 'false')
	})

	it('draws one control for a citation that crosses bold, and marks each piece pressed', async () => {
		const user = userEvent.setup()

		const { container } = renderUI(
			<Cited citations={[cite('c1', 'most of them on **Tuesday**')]} />,
		)

		expect(screen.getAllByRole('button')).toHaveLength(1)

		const [piece] = allBySlot(container, 'chat-citation-piece')

		expect(piece?.parentElement?.tagName).toBe('STRONG')

		await user.click(screen.getByRole('button'))

		expect(piece).toHaveAttribute('data-pressed')
	})

	it('renders a citation whose target is not registered as prose', () => {
		const { container } = renderUI(
			<Cited citations={[cite('c1', 'Twelve stops are late', 'unknown')]} />,
		)

		expect(screen.queryByRole('button')).toBeNull()

		expect(bySlot(container, 'markdown')?.textContent).toBe(
			'Twelve stops are late, most of them on Tuesday.',
		)
	})

	it('renders a citation as prose with no provider', () => {
		renderUI(
			<ChatMessage sender="assistant">{reply([cite('c1', 'Twelve stops are late')])}</ChatMessage>,
		)

		expect(screen.queryByRole('button')).toBeNull()
	})

	it('keeps the description out of the name of the anchor and out of sight', () => {
		renderUI(<Cited citations={[cite('c1', 'Twelve stops are late')]} />)

		const anchor = screen.getByRole('button', { name: 'Twelve stops are late' })

		const description = document.getElementById(anchor.getAttribute('aria-describedby') ?? '')

		expect(description).toHaveAttribute('hidden')

		expect(anchor.contains(description)).toBe(false)
	})

	it('merges the targets of a nested provider with those of the outer one', () => {
		renderUI(
			<ChatCitationProvider targets={targets} cited={null} onCite={() => {}}>
				<ChatCitationProvider
					targets={{ other: { label: 'Other' } }}
					cited={null}
					onCite={() => {}}
				>
					<ChatMessage sender="assistant">
						{reply([cite('c1', 'Twelve stops are late'), cite('c2', 'Tuesday', 'other')])}
					</ChatMessage>
				</ChatCitationProvider>
			</ChatCitationProvider>,
		)

		expect(screen.getAllByRole('button')).toHaveLength(2)
	})
})

describe('ChatCitationProvider isMarked', () => {
	const late = cite('late', 'Twelve stops are late')

	const tuesday = cite('tue', 'on **Tuesday**')

	const isTuesday = (citation: ChatCitation) => citation.id === 'tue'

	it('marks each piece of a citation that the selection matches, and no other', () => {
		const { container } = renderUI(
			<ChatCitationProvider targets={targets} cited={null} onCite={() => {}} isMarked={isTuesday}>
				<ChatMessage sender="assistant">{reply([late, tuesday])}</ChatMessage>
			</ChatCitationProvider>,
		)

		const anchor = screen.getByRole('button', { name: 'on' })

		expect(anchor).toHaveAttribute('data-marked')

		// A marked citation is not pressed: a press makes it the active citation.
		expect(anchor).toHaveAttribute('aria-pressed', 'false')

		expect(bySlot(container, 'chat-citation-piece')).toHaveAttribute('data-marked')

		expect(screen.getByRole('button', { name: 'Twelve stops are late' })).not.toHaveAttribute(
			'data-marked',
		)
	})

	it('says in the description that the selection matches the citation', () => {
		renderUI(
			<ChatCitationProvider targets={targets} cited={null} onCite={() => {}} isMarked={isTuesday}>
				<ChatMessage sender="assistant">{reply([late, tuesday])}</ChatMessage>
			</ChatCitationProvider>,
		)

		expect(screen.getByRole('button', { name: 'on' })).toHaveAccessibleDescription(
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
			<ChatCitationProvider targets={targets} cited={null} onCite={() => {}} isMarked={isTuesday}>
				<ChatCitationProvider targets={{}} cited={null} onCite={() => {}} isMarked={isMarked}>
					<ChatMessage sender="assistant">{reply([late, tuesday])}</ChatMessage>
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
