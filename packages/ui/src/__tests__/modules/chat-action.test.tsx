import { describe, expect, it, vi } from 'vitest'
import { ChatMessage, type ChatMessageProps } from '../../modules/chat'
import type { ChatActionPart } from '../../modules/chat/engine/chat-content/types'
import { renderUI, screen, setupUser, within } from '../helpers'

const choice: ChatActionPart = {
	kind: 'action',
	id: 'carrier',
	prompt: 'Which carrier should take it?',
	title: 'Carrier',
	success: 'Carrier picked',
	input: {
		kind: 'choice',
		name: 'carrier',
		options: [
			{ value: 'northline', label: 'Northline Freight', description: 'Pickup at 1 PM' },
			{ value: 'atlas', label: 'Atlas Haulage' },
		],
	},
}

const form: ChatActionPart = {
	kind: 'action',
	id: 'details',
	prompt: 'Delivery details needed',
	title: 'Delivery details',
	success: 'Delivery details sent',
	input: {
		kind: 'form',
		label: 'Add details',
		fields: [
			{ kind: 'text', name: 'contact', label: 'Contact name', required: true },
			{ kind: 'checkbox', name: 'liftgate', label: 'Needs a liftgate' },
		],
	},
}

function renderAction(part: ChatActionPart, onActionSubmit?: ChatMessageProps['onActionSubmit']) {
	return renderUI(
		<ChatMessage contextMenu={false} onActionSubmit={onActionSubmit}>
			{[part]}
		</ChatMessage>,
	)
}

describe('ChatAction', () => {
	it('draws a choice as a heading, radios named by it, and a Submit that waits for a pick', async () => {
		const user = setupUser()

		const onActionSubmit = vi.fn()

		renderAction(choice, onActionSubmit)

		const group = screen.getByRole('radiogroup', { name: 'Which carrier should take it?' })

		const submit = screen.getByRole('button', { name: 'Submit' })

		expect(submit).toBeDisabled()

		await user.click(within(group).getByRole('radio', { name: 'Atlas Haulage' }))

		await user.click(submit)

		expect(onActionSubmit).toHaveBeenCalledWith('carrier', { carrier: 'atlas' })
	})

	it('opens a form in a panel, refuses an empty required field, and submits the values', async () => {
		const user = setupUser()

		const onActionSubmit = vi.fn()

		renderAction(form, onActionSubmit)

		expect(screen.getByRole('heading', { name: 'Delivery details needed' })).toBeInTheDocument()

		await user.click(screen.getByRole('button', { name: 'Add details' }))

		const dialog = await screen.findByRole('dialog', { name: 'Delivery details' })

		await user.click(within(dialog).getByRole('button', { name: 'Submit' }))

		expect(onActionSubmit).not.toHaveBeenCalled()

		expect(within(dialog).getByText('Fill in this field.')).toBeInTheDocument()

		await user.type(within(dialog).getByRole('textbox', { name: 'Contact name' }), 'Dana Ortiz')

		await user.click(within(dialog).getByRole('button', { name: 'Submit' }))

		expect(onActionSubmit).toHaveBeenCalledWith('details', {
			contact: 'Dana Ortiz',
			liftgate: false,
		})
	})

	it('draws an answered ask as a success alert that opens the values for review', async () => {
		const user = setupUser()

		renderAction({ ...form, result: { contact: 'Dana Ortiz', liftgate: true } }, vi.fn())

		expect(screen.queryByRole('button', { name: 'Add details' })).not.toBeInTheDocument()

		expect(screen.getByText('Delivery details sent')).toBeInTheDocument()

		await user.click(screen.getByRole('button', { name: 'Review details' }))

		const dialog = await screen.findByRole('dialog', { name: 'Delivery details' })

		expect(within(dialog).getByText('Dana Ortiz')).toBeInTheDocument()

		expect(within(dialog).getByText('Yes')).toBeInTheDocument()
	})

	it('draws an ask read-only where the message takes no answer', async () => {
		const user = setupUser()

		renderAction(form)

		await user.click(screen.getByRole('button', { name: 'Add details' }))

		expect(screen.queryByRole('dialog')).not.toBeInTheDocument()
	})
})

describe('ChatMessage versions', () => {
	it('shows no "(revised)" button for a message with no versions', () => {
		renderUI(<ChatMessage contextMenu={false}>Booked.</ChatMessage>)

		expect(screen.queryByRole('button', { name: /Revised/ })).not.toBeInTheDocument()
	})

	it('opens the earlier versions, oldest first, with each ask read-only', async () => {
		const user = setupUser()

		const onActionSubmit = vi.fn()

		renderUI(
			<ChatMessage
				contextMenu={false}
				onActionSubmit={onActionSubmit}
				versions={[[{ kind: 'text', id: 't1', text: 'First.' }, choice], 'Second.']}
			>
				Third.
			</ChatMessage>,
		)

		await user.click(screen.getByRole('button', { name: 'Revised, show earlier versions' }))

		const dialog = await screen.findByRole('dialog', { name: 'Earlier versions' })

		const headings = within(dialog).getAllByRole('heading', { level: 3 })

		expect(headings.map((heading) => heading.textContent)).toEqual([
			'Version 1',
			'Which carrier should take it?',
			'Version 2',
		])

		await user.click(within(dialog).getByRole('radio', { name: 'Atlas Haulage' }))

		expect(within(dialog).getByRole('radio', { name: 'Atlas Haulage' })).not.toBeChecked()

		expect(onActionSubmit).not.toHaveBeenCalled()
	})
})
