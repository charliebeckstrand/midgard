import { useState } from 'react'
import { describe, expect, it, vi } from 'vitest'
import { ChatFeedback, type ChatVerdict } from '../../modules/chat'
import { LocaleProvider } from '../../providers/locale'
import { renderUI, screen, setupUser } from '../helpers'

describe('ChatFeedback', () => {
	it('is two toggle buttons, with neither pressed at first', () => {
		renderUI(<ChatFeedback />)

		expect(screen.getByRole('button', { name: 'Good reply' })).toHaveAttribute(
			'aria-pressed',
			'false',
		)

		expect(screen.getByRole('button', { name: 'Bad reply' })).toHaveAttribute(
			'aria-pressed',
			'false',
		)
	})

	it('holds one rating: a press on one releases the other', async () => {
		const onValueChange = vi.fn()

		const user = setupUser()

		renderUI(<ChatFeedback onValueChange={onValueChange} />)

		const good = screen.getByRole('button', { name: 'Good reply' })

		const bad = screen.getByRole('button', { name: 'Bad reply' })

		await user.click(good)

		expect(good).toHaveAttribute('aria-pressed', 'true')

		await user.click(bad)

		expect(bad).toHaveAttribute('aria-pressed', 'true')

		expect(good).toHaveAttribute('aria-pressed', 'false')

		expect(onValueChange.mock.calls).toEqual([['good'], ['bad']])
	})

	it('clears the rating when the reader presses the pressed button again', async () => {
		const onValueChange = vi.fn()

		const user = setupUser()

		renderUI(<ChatFeedback defaultValue="good" onValueChange={onValueChange} />)

		const good = screen.getByRole('button', { name: 'Good reply' })

		await user.click(good)

		expect(good).toHaveAttribute('aria-pressed', 'false')

		expect(onValueChange).toHaveBeenCalledWith(null)
	})

	it('shows the rating of a controlled owner', async () => {
		function Owner() {
			const [value, setValue] = useState<ChatVerdict | null>('bad')

			return <ChatFeedback value={value} onValueChange={setValue} />
		}

		const user = setupUser()

		renderUI(<Owner />)

		expect(screen.getByRole('button', { name: 'Bad reply' })).toHaveAttribute(
			'aria-pressed',
			'true',
		)

		await user.click(screen.getByRole('button', { name: 'Good reply' }))

		expect(screen.getByRole('button', { name: 'Good reply' })).toHaveAttribute(
			'aria-pressed',
			'true',
		)

		expect(screen.getByRole('button', { name: 'Bad reply' })).toHaveAttribute(
			'aria-pressed',
			'false',
		)
	})

	it('names its buttons in the language of the locale', () => {
		renderUI(
			<LocaleProvider locale="es">
				<ChatFeedback />
			</LocaleProvider>,
		)

		expect(screen.getByRole('button', { name: 'Buena respuesta' })).toBeInTheDocument()
	})
})
