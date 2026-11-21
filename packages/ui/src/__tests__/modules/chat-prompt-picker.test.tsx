import { useState } from 'react'
import { describe, expect, it, vi } from 'vitest'
import {
	type ChatCitation,
	ChatPrompt,
	type ChatPromptItem,
	type ChatPromptSource,
} from '../../modules/chat'
import {
	deferred,
	fireEvent,
	getSlot,
	noop,
	renderUI,
	screen,
	setupUser,
	waitFor,
} from '../helpers'
import { axe } from '../helpers/axe'

const ITEMS: ChatPromptItem[] = [
	{ key: 'late', label: 'Late stops', selector: { dataset: 'late' } },
	{ key: 'routes', label: 'Routes', selector: { dataset: 'routes' } },
	{ key: 'depots', label: 'Depots', selector: { dataset: 'depots' } },
]

const datasets: ChatPromptSource = {
	trigger: '@',
	target: 'dataset',
	label: 'Datasets',
	search: (query) => ITEMS.filter((item) => item.label.toLowerCase().includes(query)),
}

const commands: ChatPromptSource = {
	trigger: '/',
	target: 'command',
	label: 'Commands',
	at: 'start',
	search: () => [{ key: 'clear', label: 'clear', selector: 'clear' }],
}

/** A composer that holds its own draft, and reports each change of it. */
function Composer({
	sources,
	onDraft = noop,
	onSubmit = noop,
}: {
	sources: readonly ChatPromptSource[]
	onDraft?: (value: string, citations: readonly ChatCitation[]) => void
	onSubmit?: () => void
}) {
	const [draft, setDraft] = useState<{ value: string; citations: readonly ChatCitation[] }>({
		value: '',
		citations: [],
	})

	return (
		<ChatPrompt
			value={draft.value}
			citations={draft.citations}
			onValueChange={(value, citations) => {
				setDraft({ value, citations })

				onDraft(value, citations)
			}}
			sources={sources}
			onSubmit={onSubmit}
		/>
	)
}

/** Types `text` into the composer as the user. */
async function typeInto(container: HTMLElement, text: string) {
	const user = setupUser()

	await user.type(getSlot<HTMLTextAreaElement>(container, 'chat-prompt'), text)

	return user
}

const options = () => screen.queryAllByRole('option').map((option) => option.textContent)

describe('ChatPrompt picker', () => {
	it('opens a listbox of the source at its trigger, named by the source', async () => {
		const { container } = renderUI(<Composer sources={[datasets]} />)

		await typeInto(container, 'Compare @')

		expect(screen.getByRole('listbox', { name: 'Datasets' })).toBeInTheDocument()

		expect(options()).toEqual(['Late stops', 'Routes', 'Depots'])
	})

	it('names the popup on the textbox, which keeps its role and the focus', async () => {
		const { container } = renderUI(<Composer sources={[datasets]} />)

		const textarea = getSlot<HTMLTextAreaElement>(container, 'chat-prompt')

		expect(textarea).toHaveAttribute('aria-autocomplete', 'list')

		expect(textarea).toHaveAttribute('aria-haspopup', 'listbox')

		expect(textarea).not.toHaveAttribute('aria-controls')

		await typeInto(container, '@')

		expect(textarea).toHaveAttribute('aria-controls', screen.getByRole('listbox').id)

		expect(textarea).toHaveFocus()

		// The top match has the highlight, so Enter chooses what the reader sees first.
		expect(textarea).toHaveAttribute('aria-activedescendant', screen.getAllByRole('option')[0]?.id)
	})

	it('filters by the query between the trigger and the caret', async () => {
		const { container } = renderUI(<Composer sources={[datasets]} />)

		await typeInto(container, '@ro')

		expect(options()).toEqual(['Routes'])
	})

	it('chooses on Enter: the quote replaces the query, and the draft holds a citation', async () => {
		const onDraft = vi.fn()

		const onSubmit = vi.fn()

		const { container } = renderUI(
			<Composer sources={[datasets]} onDraft={onDraft} onSubmit={onSubmit} />,
		)

		const user = await typeInto(container, 'Compare @ro')

		await user.keyboard('{Enter}')

		expect(onSubmit).not.toHaveBeenCalled()

		expect(onDraft).toHaveBeenLastCalledWith('Compare @Routes ', [
			expect.objectContaining({
				start: 8,
				end: 15,
				quote: '@Routes',
				target: 'dataset',
				selector: { dataset: 'routes' },
			}),
		])

		expect(getSlot<HTMLTextAreaElement>(container, 'chat-prompt').value).toBe('Compare @Routes ')

		expect(screen.queryByRole('listbox')).toBeNull()
	})

	it('moves the highlight with the arrows and chooses on Tab', async () => {
		const onDraft = vi.fn()

		const { container } = renderUI(<Composer sources={[datasets]} onDraft={onDraft} />)

		const user = await typeInto(container, '@')

		await user.keyboard('{ArrowDown}{ArrowDown}{Tab}')

		expect(onDraft).toHaveBeenLastCalledWith('@Depots ', [
			expect.objectContaining({ quote: '@Depots' }),
		])
	})

	it('chooses on a press, and the textarea keeps the focus', async () => {
		const onDraft = vi.fn()

		const { container } = renderUI(<Composer sources={[datasets]} onDraft={onDraft} />)

		const user = await typeInto(container, '@')

		await user.click(screen.getByRole('option', { name: 'Depots' }))

		expect(onDraft).toHaveBeenLastCalledWith('@Depots ', [
			expect.objectContaining({ quote: '@Depots' }),
		])

		expect(getSlot(container, 'chat-prompt')).toHaveFocus()
	})

	it('submits on Enter while no option has the highlight', async () => {
		const onSubmit = vi.fn()

		const { container } = renderUI(<Composer sources={[datasets]} onSubmit={onSubmit} />)

		const user = await typeInto(container, 'Ask @zzz')

		expect(options()).toEqual([])

		await user.keyboard('{Enter}')

		expect(onSubmit).toHaveBeenCalledOnce()
	})

	it('closes on Escape for that trigger, and opens again at the next one', async () => {
		const { container } = renderUI(<Composer sources={[datasets]} />)

		const user = await typeInto(container, '@')

		await user.keyboard('{Escape}')

		expect(screen.queryByRole('listbox')).toBeNull()

		// The query changes, and the trigger is the same one.
		await user.keyboard('r')

		expect(screen.queryByRole('listbox')).toBeNull()

		await user.keyboard(' @')

		expect(screen.getByRole('listbox')).toBeInTheDocument()
	})

	it('opens a command source only at the start of the draft', async () => {
		const { container } = renderUI(<Composer sources={[datasets, commands]} />)

		const user = await typeInto(container, 'a /')

		expect(screen.queryByRole('listbox')).toBeNull()

		await user.clear(getSlot(container, 'chat-prompt'))

		await user.keyboard('/')

		expect(screen.getByRole('listbox', { name: 'Commands' })).toBeInTheDocument()
	})

	it('does not open at a quote that the reader typed after a choice', async () => {
		const { container } = renderUI(<Composer sources={[datasets]} />)

		const user = await typeInto(container, '@ro')

		await user.keyboard('{Enter}')

		// The caret is after the space that follows the citation.
		expect(screen.queryByRole('listbox')).toBeNull()

		await user.keyboard('{ArrowLeft}')

		// The caret is at the end of the citation, which is a choice and not a query.
		expect(screen.queryByRole('listbox')).toBeNull()
	})

	it('says that an async source loads, and then shows its items', async () => {
		const pending = deferred<readonly ChatPromptItem[]>()

		const source: ChatPromptSource = { ...datasets, search: () => pending.promise }

		const { container } = renderUI(<Composer sources={[source]} />)

		await typeInto(container, '@')

		expect(screen.getByRole('listbox')).toHaveAttribute('aria-busy', 'true')

		expect(getSlot(document.body, 'chat-prompt-picker-status')).toHaveTextContent('Loading')

		pending.resolve(ITEMS)

		await waitFor(() => expect(options()).toEqual(['Late stops', 'Routes', 'Depots']))

		expect(screen.getByRole('listbox')).not.toHaveAttribute('aria-busy')
	})

	it('says that a source holds no item, and that a source failed', async () => {
		const empty: ChatPromptSource = { ...datasets, search: () => [] }

		const { container, unmount } = renderUI(<Composer sources={[empty]} />)

		await typeInto(container, '@')

		expect(getSlot(document.body, 'chat-prompt-picker-status')).toHaveTextContent('No results')

		unmount()

		const failing: ChatPromptSource = {
			...datasets,
			search: () => Promise.reject(new Error('down')),
		}

		const second = renderUI(<Composer sources={[failing]} />)

		await typeInto(second.container, '@')

		await waitFor(() =>
			expect(getSlot(document.body, 'chat-prompt-picker-status')).toHaveTextContent(
				'Could not load the choices',
			),
		)
	})

	it('aborts the search of a query that changed, and drops its result', async () => {
		const searches: {
			query: string
			signal: AbortSignal
			done: ReturnType<typeof deferred<readonly ChatPromptItem[]>>
		}[] = []

		const source: ChatPromptSource = {
			...datasets,
			search: (query, signal) => {
				const done = deferred<readonly ChatPromptItem[]>()

				searches.push({ query, signal, done })

				return done.promise
			},
		}

		const { container } = renderUI(<Composer sources={[source]} />)

		await typeInto(container, '@r')

		const first = searches.find((s) => s.query === '')

		const last = searches.at(-1)

		expect(first?.signal.aborted).toBe(true)

		expect(last?.query).toBe('r')

		last?.done.resolve(ITEMS.slice(1, 2))

		await waitFor(() => expect(options()).toEqual(['Routes']))

		// The stale answer lands after the fresh one and changes nothing.
		first?.done.resolve(ITEMS)

		await Promise.resolve()

		expect(options()).toEqual(['Routes'])
	})

	it('shows no item of another trigger while the next one loads', async () => {
		const searches: ReturnType<typeof deferred<readonly ChatPromptItem[]>>[] = []

		const source: ChatPromptSource = {
			...datasets,
			search: () => {
				const done = deferred<readonly ChatPromptItem[]>()

				searches.push(done)

				return done.promise
			},
		}

		const onSubmit = vi.fn()

		const { container } = renderUI(<Composer sources={[source]} onSubmit={onSubmit} />)

		const user = await typeInto(container, '@')

		searches.at(-1)?.resolve(ITEMS.slice(2))

		await waitFor(() => expect(options()).toEqual(['Depots']))

		await user.keyboard('{Enter}')

		// A new trigger of the same source: its search has not answered yet.
		await user.keyboard('@')

		expect(screen.getByRole('listbox')).toHaveAttribute('aria-busy', 'true')

		expect(options()).toEqual([])

		// No stale option has the highlight, so Enter sends.
		await user.keyboard('{Enter}')

		expect(onSubmit).toHaveBeenCalledOnce()
	})

	it('leaves the arrows to the textarea while the list holds no option', async () => {
		const { container } = renderUI(<Composer sources={[datasets]} />)

		await typeInto(container, 'one{Shift>}{Enter}{/Shift}see @zzz')

		expect(screen.getByRole('listbox')).toBeInTheDocument()

		expect(options()).toEqual([])

		const textarea = getSlot<HTMLTextAreaElement>(container, 'chat-prompt')

		// `fireEvent` gives `false` when a handler cancels the key.
		expect(fireEvent.keyDown(textarea, { key: 'ArrowUp' })).toBe(true)

		expect(fireEvent.keyDown(textarea, { key: 'ArrowDown' })).toBe(true)
	})

	it('has no axe violation while open', async () => {
		const { container } = renderUI(<Composer sources={[datasets]} />)

		await typeInto(container, '@')

		expect(await axe(document.body)).toHaveNoViolations()
	})
})
