import { useState } from 'react'
import { describe, expect, it, vi } from 'vitest'
import { userEvent } from 'vitest/browser'
import { Dialog, DialogPanel } from '../../../components/dialog'
import {
	type ChatCitation,
	ChatPrompt,
	type ChatPromptItem,
	type ChatPromptSource,
} from '../../../modules/chat'
import { getSlot, renderUI, screen, waitFor } from '../../helpers'

const ITEMS: ChatPromptItem[] = [
	{ key: 'late', label: 'Late stops', selector: { dataset: 'late' } },
	{ key: 'routes', label: 'Routes', selector: { dataset: 'routes' } },
	{ key: 'q3', label: '*Q3* [plan]', selector: { dataset: 'q3' } },
]

const sources: ChatPromptSource[] = [
	{
		trigger: '@',
		target: 'dataset',
		label: 'Datasets',
		search: (query) =>
			ITEMS.filter((item) => item.label.toLowerCase().includes(query.toLowerCase())),
	},
]

/** A composer that holds its own draft, as `useChatDraft` does, and shows its citations. */
function Composer({ wysiwyg = false }: { wysiwyg?: boolean }) {
	const [draft, setDraft] = useState<{ value: string; citations: readonly ChatCitation[] }>({
		value: '',
		citations: [],
	})

	return (
		<>
			<ChatPrompt
				value={draft.value}
				citations={draft.citations}
				onValueChange={(value, citations) => setDraft({ value, citations })}
				sources={sources}
				onSubmit={() => {}}
				wysiwyg={wysiwyg}
			/>
			<output data-testid="citations">{draft.citations.map((c) => c.quote).join('|')}</output>
			<output data-testid="value">{draft.value}</output>
			<output data-testid="draft">{JSON.stringify(draft.citations)}</output>
		</>
	)
}

const textarea = () => getSlot<HTMLTextAreaElement>(document.body, 'chat-prompt')

const citations = () => screen.getByTestId('citations').textContent

/**
 * The picker of a chat prompt in a real browser: the undo stack of the
 * textarea, the selection that a Backspace deletes, the escape layers, and the
 * place of the panel. jsdom has no `execCommand` and no layout.
 */
describe('the picker of a chat prompt (real browser)', () => {
	it('puts a choice on the undo stack of the textarea', async () => {
		renderUI(<Composer />)

		await userEvent.click(textarea())

		await userEvent.keyboard('Ask @ro{Enter}')

		expect(textarea().value).toBe('Ask @Routes ')

		expect(citations()).toBe('@Routes')

		await userEvent.keyboard('{Control>}z{/Control}')

		// The undo gives back the query, and the citation dissolves with its text.
		await waitFor(() => expect(textarea().value).toBe('Ask @ro'))

		expect(citations()).toBe('')
	})

	it('brings the citation back on a redo of the choice', async () => {
		renderUI(<Composer />)

		await userEvent.click(textarea())

		await userEvent.keyboard('Ask @ro{Enter}')

		await userEvent.keyboard('{Control>}z{/Control}')

		await waitFor(() => expect(textarea().value).toBe('Ask @ro'))

		await userEvent.keyboard('{Control>}{Shift>}z{/Shift}{/Control}')

		await waitFor(() => expect(textarea().value).toBe('Ask @Routes '))

		expect(citations()).toBe('@Routes')
	})

	it('gives typed prose no citation on an undo, when the same text was chosen later', async () => {
		renderUI(<Composer />)

		await userEvent.click(textarea())

		// The reader types the phrase as prose, clears the draft, and then chooses it.
		await userEvent.keyboard('Ask @Routes{Escape} ')

		await userEvent.keyboard('{Control>}a{/Control}{Backspace}')

		await userEvent.keyboard('Ask @ro{Enter}')

		expect(citations()).toBe('@Routes')

		// Undo back to the prose. The browser groups typed keys into undo steps, so
		// the count of steps is the browser's.
		for (let step = 0; step < 10; step++) {
			await userEvent.keyboard('{Control>}z{/Control}')

			if (textarea().value === 'Ask @Routes ' && step > 0) break
		}

		expect(textarea().value).toBe('Ask @Routes ')

		expect(citations()).toBe('')
	})

	it('brings no citation back when the reader types its quote again', async () => {
		renderUI(<Composer />)

		await userEvent.click(textarea())

		await userEvent.keyboard('Ask @ro{Enter}')

		// The Backspaces delete the space and each character of the citation.
		await userEvent.keyboard('{Backspace}'.repeat('@Routes '.length))

		expect(textarea().value).toBe('Ask ')

		// The same value as before, typed: Escape closes the picker of the typed `@`.
		await userEvent.keyboard('@Routes{Escape} ')

		expect(textarea().value).toBe('Ask @Routes ')

		expect(citations()).toBe('')
	})

	it('opens the picker again on a Backspace at the end of a citation', async () => {
		renderUI(<Composer />)

		await userEvent.click(textarea())

		await userEvent.keyboard('Ask @la{Enter}')

		expect(textarea().value).toBe('Ask @Late stops ')

		// The first Backspace deletes the space after the citation, and the second one character of it.
		await userEvent.keyboard('{Backspace}{Backspace}')

		expect(textarea().value).toBe('Ask @Late stop')

		expect(citations()).toBe('')

		await waitFor(() => expect(screen.getByRole('option')).toHaveTextContent('Late stops'))

		// A space after the words of the label ends the query.
		await userEvent.keyboard('s and')

		await waitFor(() => expect(screen.queryByRole('listbox')).toBeNull())

		expect(textarea().value).toBe('Ask @Late stops and')
	})

	it('closes only the picker on Escape inside a dialog', async () => {
		renderUI(
			<Dialog open onOpenChange={() => {}}>
				<DialogPanel aria-label="Ask">
					<Composer />
				</DialogPanel>
			</Dialog>,
		)

		await userEvent.click(textarea())

		await userEvent.keyboard('@')

		expect(screen.getByRole('listbox')).toBeVisible()

		await userEvent.keyboard('{Escape}')

		await waitFor(() => expect(screen.queryByRole('listbox')).toBeNull())

		expect(screen.getByRole('dialog')).toBeVisible()

		expect(textarea()).toHaveFocus()
	})

	it('sits above the composer, as wide as its field', async () => {
		renderUI(
			<div style={{ paddingTop: 400, width: 480 }}>
				<Composer />
			</div>,
		)

		await userEvent.click(textarea())

		await userEvent.keyboard('@')

		const panel = getSlot(document.body, 'chat-prompt-picker')

		const frame = textarea().closest('[data-slot="control-frame"]')

		await waitFor(() => {
			const panelBox = panel.getBoundingClientRect()

			const frameBox = frame?.getBoundingClientRect()

			expect(panelBox.bottom).toBeLessThanOrEqual(frameBox?.top ?? 0)

			expect(Math.round(panelBox.width)).toBe(Math.round(frameBox?.width ?? 0))
		})
	})
})

/** The editable element of the formatted field, once its editor loads and has the focus. */
async function editable(): Promise<HTMLElement> {
	await userEvent.click(screen.getByRole('textbox'))

	await waitFor(() =>
		expect(screen.getByRole('textbox')).toHaveAttribute('contenteditable', 'true'),
	)

	const field = screen.getByRole('textbox')

	await waitFor(() => expect(field).toHaveFocus())

	return field
}

const value = () => screen.getByTestId('value').textContent

const draftCitations = (): ChatCitation[] =>
	JSON.parse(screen.getByTestId('draft').textContent ?? '')

/**
 * The picker of a chat prompt with `wysiwyg` in a real browser: the query in
 * the text of the block, the citation in the Markdown value, and the undo
 * history of the editor.
 */
describe('the picker of a chat prompt in the formatted field (real browser)', () => {
	it('puts a citation in the value, with the offsets of the Markdown', async () => {
		renderUI(<Composer wysiwyg />)

		const field = await editable()

		// The query is in the text of the block, past the bold.
		await userEvent.keyboard('Ask **now** @ro')

		const option = await screen.findByRole('option', { name: 'Routes' })

		// The field keeps the focus, and the highlight is its active descendant.
		expect(field).toHaveFocus()

		expect(field).toHaveAttribute('aria-controls', screen.getByRole('listbox').id)

		await waitFor(() => expect(field).toHaveAttribute('aria-activedescendant', option.id))

		await userEvent.keyboard('{Enter}')

		await waitFor(() => expect(screen.queryByRole('listbox')).toBeNull())

		expect(value()).toBe('Ask **now** @Routes ')

		expect(draftCitations()).toEqual([
			{
				id: expect.any(String),
				target: 'dataset',
				selector: { dataset: 'routes' },
				start: 12,
				end: 19,
				quote: '@Routes',
			},
		])

		expect(field.querySelector('[data-slot="wysiwyg-range"]')).toHaveTextContent('@Routes')

		// Enter chose, and did not send or split the block.
		expect(field.querySelectorAll('p')).toHaveLength(1)

		// The caret is after the space, so the reader types on.
		await userEvent.keyboard('today')

		expect(value()).toBe('Ask **now** @Routes today')
	})

	it('takes the choice back on an undo, and brings it back on a redo', async () => {
		renderUI(<Composer wysiwyg />)

		await editable()

		await userEvent.keyboard('Ask @ro{Enter}')

		await waitFor(() => expect(citations()).toBe('@Routes'))

		await userEvent.keyboard('{Control>}z{/Control}')

		// The undo gives back the query, and the picker opens on it again.
		await waitFor(() => expect(value()).toBe('Ask @ro'))

		expect(citations()).toBe('')

		await waitFor(() => expect(screen.getByRole('option')).toHaveTextContent('Routes'))

		// A real keyboard gives `Z` with Shift. ProseMirror reads a `z` with Shift as an undo.
		await userEvent.keyboard('{Escape}{Control>}{Shift>}Z{/Shift}{/Control}')

		await waitFor(() => expect(value()).toBe('Ask @Routes '))

		expect(citations()).toBe('@Routes')
	})

	it('writes a label with Markdown characters as text', async () => {
		renderUI(<Composer wysiwyg />)

		const field = await editable()

		await userEvent.keyboard('See @q3')

		await screen.findByRole('option', { name: '*Q3* [plan]' })

		await userEvent.keyboard('{Tab}')

		await waitFor(() => expect(value()).toBe('See @\\*Q3\\* \\[plan\\] '))

		// The field shows the label as typed, with no emphasis and no link.
		expect(field).toHaveTextContent('See @*Q3* [plan]')

		expect(field.querySelector('em')).toBeNull()

		expect(citations()).toBe('@\\*Q3\\* \\[plan\\]')
	})

	it('opens the picker again on a Backspace at the end of a citation', async () => {
		renderUI(<Composer wysiwyg />)

		await editable()

		await userEvent.keyboard('Ask @la{Enter}')

		await waitFor(() => expect(value()).toBe('Ask @Late stops '))

		await userEvent.keyboard('{Backspace}{Backspace}')

		await waitFor(() => expect(value()).toBe('Ask @Late stop'))

		expect(citations()).toBe('')

		await waitFor(() => expect(screen.getByRole('option')).toHaveTextContent('Late stops'))
	})

	it('closes only the picker on Escape inside a dialog, and then the dialog', async () => {
		const onOpenChange = vi.fn()

		renderUI(
			<Dialog open onOpenChange={onOpenChange}>
				<DialogPanel aria-label="Ask">
					<Composer wysiwyg />
				</DialogPanel>
			</Dialog>,
		)

		const field = await editable()

		await userEvent.keyboard('@')

		expect(await screen.findByRole('listbox')).toBeVisible()

		await userEvent.keyboard('{Escape}')

		await waitFor(() => expect(screen.queryByRole('listbox')).toBeNull())

		expect(screen.getByRole('dialog')).toBeVisible()

		expect(field).toHaveFocus()

		expect(field).not.toHaveAttribute('aria-activedescendant')

		// With the picker closed, the next Escape is for the dialog.
		await userEvent.keyboard('{Escape}')

		expect(onOpenChange).toHaveBeenCalledWith(false)
	})

	it('sits above the composer, as wide as its frame', async () => {
		renderUI(
			<div style={{ paddingTop: 400, width: 480 }}>
				<Composer wysiwyg />
			</div>,
		)

		const field = await editable()

		await userEvent.keyboard('@')

		const panel = getSlot(document.body, 'chat-prompt-picker')

		const frame = field.closest('[data-slot="control-frame"]')

		await waitFor(() => {
			const panelBox = panel.getBoundingClientRect()

			const frameBox = frame?.getBoundingClientRect()

			expect(panelBox.bottom).toBeLessThanOrEqual(frameBox?.top ?? 0)

			expect(Math.round(panelBox.width)).toBe(Math.round(frameBox?.width ?? 0))
		})
	})
})
