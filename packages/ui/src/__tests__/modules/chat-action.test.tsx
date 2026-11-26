import { useState } from 'react'
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

	it('moves the focus to Review details when a choice submit draws the alert', async () => {
		const user = setupUser()

		function Answered() {
			const [part, setPart] = useState(choice)

			return (
				<ChatMessage
					contextMenu={false}
					onActionSubmit={(_, result) => setPart((prev) => ({ ...prev, result }))}
				>
					{[part]}
				</ChatMessage>
			)
		}

		renderUI(<Answered />)

		await user.click(screen.getByRole('radio', { name: 'Atlas Haulage' }))

		await user.click(screen.getByRole('button', { name: 'Submit' }))

		expect(screen.getByRole('button', { name: 'Review details' })).toHaveFocus()
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

		// The success color with no icon.
		expect(document.querySelector('[data-slot=chat-action] [data-slot=icon]')).toBeNull()

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

	it('picks no option of a choice where the message takes no answer', async () => {
		const user = setupUser()

		renderAction(choice)

		await user.click(screen.getByRole('radio', { name: 'Atlas Haulage' }))

		expect(screen.getByRole('radio', { name: 'Atlas Haulage' })).toBeUnchecked()
	})
})

describe('ChatMessage revised', () => {
	it('shows a quiet "(revised)" label below a revised message', () => {
		renderUI(
			<ChatMessage contextMenu={false} revised>
				Booked.
			</ChatMessage>,
		)

		expect(screen.getByText('(revised)')).toBeInTheDocument()
	})

	it('shows one label, and an edit wins, because an edit makes a new message', () => {
		renderUI(
			<ChatMessage contextMenu={false} edited revised>
				Booked.
			</ChatMessage>,
		)

		expect(screen.getByText('(edited)')).toBeInTheDocument()

		expect(screen.queryByText('(revised)')).not.toBeInTheDocument()
	})
})
