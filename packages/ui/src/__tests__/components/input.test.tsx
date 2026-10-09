import { useState } from 'react'
import { describe, expect, it, vi } from 'vitest'
import { Form } from '../../components/form'
import { Input } from '../../components/input'
import { act, bySlot, getSlot, renderUI, screen, setupUser } from '../helpers'

describe('Input', () => {
	it('renders an input with data-slot="input"', () => {
		const { container } = renderUI(<Input />)

		const input = bySlot(container, 'input')

		expect(input).toBeInTheDocument()

		expect(input?.tagName).toBe('INPUT')
	})

	it('sets the type attribute', () => {
		const { container } = renderUI(<Input type="email" />)

		const input = bySlot(container, 'input')

		expect(input).toHaveAttribute('type', 'email')
	})

	it('treats a null/false affix as absent, and renders a 0 affix', () => {
		const { container, rerender } = renderUI(<Input prefix={null} suffix={false} />)

		// No affix means no flex wrapper class and no stray nodes.
		expect(container.querySelector('[data-slot="suffix"]')).toBeNull()

		expect(container.textContent).toBe('')

		rerender(<Input suffix={0} />)

		// A 0 affix is real content and renders inside the suffix slot,
		// not as a bare text node leaked through a truthiness guard.
		expect(container.querySelector('[data-slot="suffix"]')?.textContent).toBe('0')
	})

	it('renders prefix and suffix', () => {
		const { container } = renderUI(
			<Input
				prefix={<span data-testid="prefix">$</span>}
				suffix={<span data-testid="suffix">USD</span>}
			/>,
		)

		expect(container.querySelector('[data-testid="prefix"]')).toBeInTheDocument()

		expect(container.querySelector('[data-testid="suffix"]')).toBeInTheDocument()

		// Each affix renders inside its data-slot span; the stamp also gates
		// the input's autofill margin (`affix.autofill`, kiso/control/affix.ts).
		expect(container.querySelector('[data-slot="prefix"]')?.textContent).toBe('$')

		expect(container.querySelector('[data-slot="suffix"]')?.textContent).toBe('USD')
	})

	it('fires onChange handler', async () => {
		const onChange = vi.fn()

		const { container } = renderUI(<Input onChange={onChange} />)

		const input = getSlot<HTMLInputElement>(container, 'input')

		const user = setupUser()

		await user.type(input, 'a')

		expect(onChange).toHaveBeenCalled()
	})
})

describe('Input defaultValue under a binding (§7.2)', () => {
	it('drops defaultValue from a bound input', () => {
		const error = vi.spyOn(console, 'error').mockImplementation(() => {})

		const { container } = renderUI(
			<Form defaultValues={{ email: '' }}>
				<Input name="email" defaultValue="me@example.com" />
			</Form>,
		)

		const input = getSlot<HTMLInputElement>(container, 'input')

		expect(input.value).toBe('')

		expect(input.defaultValue).not.toBe('me@example.com')

		const warned = error.mock.calls.some(([message]) =>
			String(message).includes('both value and defaultValue'),
		)

		expect(warned).toBe(false)

		error.mockRestore()
	})

	it('keeps defaultValue on an unbound input', () => {
		const { container } = renderUI(<Input defaultValue="seed" />)

		const input = getSlot<HTMLInputElement>(container, 'input')

		expect(input.value).toBe('seed')

		expect(input.defaultValue).toBe('seed')
	})

	describe('clearable', () => {
		it.each([
			['the input is empty', () => <Input clearable aria-label="Photo" />],
			[
				'the input is disabled',
				() => <Input clearable disabled defaultValue="a" aria-label="Photo" />,
			],
			[
				'the input is read-only',
				() => <Input clearable readOnly defaultValue="a" aria-label="Photo" />,
			],
			['clearable is off', () => <Input defaultValue="a" aria-label="Photo" />],
		])('shows no clear button when %s', (_name, ui) => {
			renderUI(ui())

			expect(screen.queryByRole('button')).not.toBeInTheDocument()
		})

		it('empties an uncontrolled input, keeps the focus, and hides the button', async () => {
			const user = setupUser()

			const { container } = renderUI(<Input clearable defaultValue="abc" aria-label="Photo" />)

			await user.click(getSlot(container, 'input'))

			await user.click(screen.getByRole('button', { name: 'Clear' }))

			expect(getSlot(container, 'input')).toHaveValue('')

			expect(getSlot(container, 'input')).toHaveFocus()

			expect(screen.queryByRole('button', { name: 'Clear' })).not.toBeInTheDocument()

			await user.type(getSlot(container, 'input'), 'x')

			expect(screen.getByRole('button', { name: 'Clear' })).toBeInTheDocument()
		})

		it('clears a controlled input through onChange', async () => {
			function Controlled() {
				const [value, setValue] = useState('abc')

				return (
					<Input
						clearable
						value={value}
						onChange={(event) => setValue(event.target.value)}
						aria-label="Photo"
					/>
				)
			}

			const user = setupUser()

			const { container } = renderUI(<Controlled />)

			await user.click(screen.getByRole('button', { name: 'Clear' }))

			expect(getSlot(container, 'input')).toHaveValue('')

			expect(screen.queryByRole('button', { name: 'Clear' })).not.toBeInTheDocument()
		})

		it('hides the clear button when a native form reset empties the input', async () => {
			const user = setupUser()

			const { container } = renderUI(
				<form>
					<Input clearable aria-label="Photo" />
					<button type="reset">Reset</button>
				</form>,
			)

			await user.type(getSlot(container, 'input'), 'abc')

			expect(screen.getByRole('button', { name: 'Clear' })).toBeInTheDocument()

			await user.click(screen.getByRole('button', { name: 'Reset' }))

			// The browser reverts the input after the event, and the input reads it
			// on the next frame.
			await act(() => new Promise(requestAnimationFrame))

			expect(getSlot(container, 'input')).toHaveValue('')

			expect(screen.queryByRole('button', { name: 'Clear' })).not.toBeInTheDocument()
		})

		it('shows the clear button again when a native form reset restores defaultValue', async () => {
			const user = setupUser()

			const { container } = renderUI(
				<form>
					<Input clearable defaultValue="seed" aria-label="Photo" />
					<button type="reset">Reset</button>
				</form>,
			)

			await user.click(screen.getByRole('button', { name: 'Clear' }))

			expect(screen.queryByRole('button', { name: 'Clear' })).not.toBeInTheDocument()

			await user.click(screen.getByRole('button', { name: 'Reset' }))

			await act(() => new Promise(requestAnimationFrame))

			expect(getSlot(container, 'input')).toHaveValue('seed')

			expect(screen.getByRole('button', { name: 'Clear' })).toBeInTheDocument()
		})

		it('puts the clear button before the suffix', () => {
			const { container } = renderUI(
				<Input clearable defaultValue="acme" suffix=".example.com" aria-label="Subdomain" />,
			)

			const suffix = getSlot(container, 'suffix')

			expect(suffix.firstElementChild?.tagName).toBe('BUTTON')

			expect(suffix.textContent).toBe('.example.com')
		})
	})
})
