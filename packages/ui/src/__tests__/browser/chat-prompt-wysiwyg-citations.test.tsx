import { useState } from 'react'
import { describe, expect, it } from 'vitest'
import { userEvent } from 'vitest/browser'
import { ChatPrompt, type ChatPromptSource } from '../../modules/chat'
import type { ChatCitation } from '../../modules/chat/engine/chat-content/types'
import { noop, renderUI, screen, waitFor } from '../helpers'

const SOURCE = 'Ask about @Sales'

const CITATION: ChatCitation = {
	id: 'sales',
	start: 10,
	end: 16,
	quote: '@Sales',
	target: 'datasets',
	selector: { dataset: 'sales' },
}

const SALES: ChatPromptSource = {
	trigger: '@',
	target: 'datasets',
	label: 'Datasets',
	search: () => [{ key: 'sales', label: 'Sales', selector: { dataset: 'sales' } }],
}

/** A composer with the rich field that shows its draft. */
function Composer({
	initial = { value: SOURCE, citations: [CITATION] },
	sources,
}: {
	initial?: { value: string; citations: ChatCitation[] }
	sources?: readonly ChatPromptSource[]
}) {
	const [draft, setDraft] = useState(initial)

	return (
		<>
			<ChatPrompt
				value={draft.value}
				citations={draft.citations}
				onValueChange={(value, citations) => setDraft({ value, citations: [...citations] })}
				onSubmit={noop}
				sources={sources}
				wysiwyg
			/>
			<output data-testid="draft">{JSON.stringify(draft.citations)}</output>
		</>
	)
}

const citations = (): ChatCitation[] => JSON.parse(screen.getByTestId('draft').textContent ?? '')

/** Loads the editor through a press of the field, and gives its editable element. */
async function editable(): Promise<HTMLElement> {
	await userEvent.click(screen.getByRole('textbox'))

	await waitFor(() =>
		expect(screen.getByRole('textbox')).toHaveAttribute('contenteditable', 'true'),
	)

	const field = screen.getByRole('textbox')

	await waitFor(() => expect(field).toHaveFocus())

	return field
}

/**
 * The citations of a draft in the rich field of ChatPrompt. The caret and the
 * typing ride a real browser.
 */
describe('ChatPrompt wysiwyg citations (real browser)', () => {
	it('marks a citation and moves it across an edit before it', async () => {
		renderUI(<Composer />)

		const field = await editable()

		expect(field.querySelector('[data-slot="wysiwyg-range"]')).toHaveTextContent('@Sales')

		await userEvent.keyboard('{Home}Please ')

		await waitFor(() => expect(citations()).toEqual([{ ...CITATION, start: 17, end: 23 }]))
	})

	it('dissolves a citation on an edit in it, and an undo brings it back', async () => {
		renderUI(<Composer />)

		const field = await editable()

		await userEvent.keyboard('{End}{ArrowLeft}{ArrowLeft}x')

		await waitFor(() => expect(citations()).toEqual([]))

		expect(field.querySelector('[data-slot="wysiwyg-range"]')).toBeNull()

		await userEvent.keyboard('{ControlOrMeta>}z{/ControlOrMeta}')

		await waitFor(() => expect(citations()).toEqual([CITATION]))

		expect(field.querySelector('[data-slot="wysiwyg-range"]')).toHaveTextContent('@Sales')
	})

	it('does not grow a citation on a key typed at its end', async () => {
		renderUI(<Composer />)

		await editable()

		await userEvent.keyboard('{End}s')

		await waitFor(() => expect(screen.getByRole('textbox')).toHaveTextContent('@Saless'))

		expect(citations()).toEqual([CITATION])
	})

	it('deletes a whole citation and the space after it on a Delete at its start', async () => {
		const citation = { ...CITATION, start: 4, end: 10 }

		renderUI(<Composer initial={{ value: 'Ask @Sales now', citations: [citation] }} />)

		const field = await editable()

		await userEvent.keyboard('{Home}{ArrowRight}{ArrowRight}{ArrowRight}{ArrowRight}{Delete}')

		await waitFor(() => expect(citations()).toEqual([]))

		expect(field).toHaveTextContent(/^Ask now$/)

		// One undo brings back the citation, as it went as one unit.
		await userEvent.keyboard('{ControlOrMeta>}z{/ControlOrMeta}')

		await waitFor(() => expect(citations()).toEqual([citation]))
	})

	it('puts the caret after the space that follows a choice', async () => {
		renderUI(<Composer initial={{ value: '', citations: [] }} sources={[SALES]} />)

		const field = await editable()

		await userEvent.keyboard('@sa by day')

		// The caret goes back to the end of the trigger word, and the picker opens again.
		await userEvent.keyboard(
			'{ArrowLeft}{ArrowLeft}{ArrowLeft}{ArrowLeft}{ArrowLeft}{ArrowLeft}{ArrowLeft}',
		)

		await waitFor(() => expect(screen.getByRole('listbox')).toBeInTheDocument())

		await userEvent.keyboard('{Enter}x')

		await waitFor(() => expect(field).toHaveTextContent(/^@Sales xby day$/))
	})
})
