import { createRef } from 'react'
import { describe, expect, it, vi } from 'vitest'
import { Input } from '../../components/input'
import { Density } from '../../primitives/density'
import { bySlot, renderUI, userEvent } from '../helpers'

describe('Input', () => {
	it('renders an input with data-slot="input"', () => {
		const { container } = renderUI(<Input />)

		const input = bySlot(container, 'input')

		expect(input).toBeInTheDocument()

		expect(input?.tagName).toBe('INPUT')
	})

	it('forwards ref', () => {
		const ref = createRef<HTMLInputElement>()

		const { container } = renderUI(<Input ref={ref} />)

		expect(ref.current).toBeInstanceOf(HTMLInputElement)

		expect(ref.current).toBe(bySlot(container, 'input'))
	})

	it('sets the type attribute', () => {
		const { container } = renderUI(<Input type="email" />)

		const input = bySlot(container, 'input')

		expect(input).toHaveAttribute('type', 'email')
	})

	it('passes through placeholder', () => {
		const { container } = renderUI(<Input placeholder="Enter text" />)

		const input = bySlot(container, 'input')

		expect(input).toHaveAttribute('placeholder', 'Enter text')
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
	})

	it('fires onChange handler', async () => {
		const onChange = vi.fn()

		const { container } = renderUI(<Input onChange={onChange} />)

		const input = bySlot(container, 'input') as HTMLInputElement

		const user = userEvent.setup()

		await user.type(input, 'a')

		expect(onChange).toHaveBeenCalled()
	})

	it('renders a placeholder in skeleton mode', () => {
		const { container } = renderUI(<Input />, { skeleton: true })

		expect(bySlot(container, 'input')).not.toBeInTheDocument()
		expect(bySlot(container, 'placeholder')).toBeInTheDocument()
	})
})

describe('Input size resolution', () => {
	// Each size variant brings a unique text class via ji; matching it
	// confirms which size the kata actually rendered.
	const textClassFor = {
		sm: 'text-sm',
		md: 'text-base',
		lg: 'text-lg',
	} as const

	it('inherits size from the Density context when no explicit prop is set', () => {
		const { container } = renderUI(
			<Density scale="lg">
				<Input />
			</Density>,
		)

		expect(bySlot(container, 'input')?.className).toContain(textClassFor.lg)
	})

	it('explicit size prop overrides Density inheritance', () => {
		const { container } = renderUI(
			<Density scale="lg">
				<Input size="sm" />
			</Density>,
		)

		expect(bySlot(container, 'input')?.className).toContain(textClassFor.sm)
	})

	it('falls back to "md" outside any size context', () => {
		const { container } = renderUI(<Input />)

		expect(bySlot(container, 'input')?.className).toContain(textClassFor.md)
	})
})
