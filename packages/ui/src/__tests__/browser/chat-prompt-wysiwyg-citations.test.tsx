import { useState } from 'react'
import { describe, expect, it } from 'vitest'
import { userEvent } from 'vitest/browser'
import { ChatPrompt } from '../../modules/chat'
import type { ChatCitation } from '../../modules/chat/engine/chat-content/types'
import { noop, renderUI, screen, waitFor } from '../helpers'
import { editable, holdFocusCheck } from './helpers/wysiwyg'

const SOURCE = 'Ask about @Sales'

const CITATION: ChatCitation = {
	id: 'sales',
	start: 10,
	end: 16,
	quote: '@Sales',
	target: 'datasets',
	selector: { dataset: 'sales' },
}

/** A composer with the rich field that shows its draft. */
function Composer({
	initial = { value: SOURCE, citations: [CITATION] },
}: {
	initial?: { value: string; citations: ChatCitation[] }
}) {
	const [draft, setDraft] = useState(initial)

	return (
		<>
			<ChatPrompt
				value={draft.value}
				citations={draft.citations}
				onValueChange={(value, citations) => setDraft({ value, citations: [...citations] })}
				onSubmit={noop}
				wysiwyg
			/>
			<output data-testid="draft">{JSON.stringify(draft.citations)}</output>
		</>
	)
}

const citations = (): ChatCitation[] => JSON.parse(screen.getByTestId('draft').textContent ?? '')

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

	// On a busy page, the key comes before the check of the editor after the
	// focus. The check must not take the Home key for a reset of the browser.
	it('moves a citation across an edit at a Home key before the focus check of the editor', async () => {
		holdFocusCheck()

		renderUI(<Composer />)

		await editable()

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
})
