import { useState } from 'react'
import { describe, expect, it } from 'vitest'
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
]

const sources: ChatPromptSource[] = [
	{
		trigger: '@',
		target: 'dataset',
		label: 'Datasets',
		search: (query) => ITEMS.filter((item) => item.label.toLowerCase().includes(query)),
	},
]

/** A composer that holds its own draft, as `useChatDraft` does, and shows its citations. */
function Composer() {
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
			/>
			<output data-testid="citations">{draft.citations.map((c) => c.quote).join('|')}</output>
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

	it('deletes a whole citation on a Backspace at its end', async () => {
		renderUI(<Composer />)

		await userEvent.click(textarea())

		await userEvent.keyboard('Ask @la{Enter}')

		expect(textarea().value).toBe('Ask @Late stops ')

		// The first Backspace deletes the space after the citation, and the second the citation.
		await userEvent.keyboard('{Backspace}{Backspace}')

		expect(textarea().value).toBe('Ask ')

		expect(citations()).toBe('')
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
