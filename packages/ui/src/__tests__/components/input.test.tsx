import { createRef } from 'react'
import { describe, expect, it, vi } from 'vitest'
import { Concentric } from '../../components/concentric'
import { Input } from '../../components/input'
import { bySlot, renderUI, userEvent } from '../helpers'

describe('Input', () => {
	it('renders an input with data-slot="input"', () => {
		const { container } = renderUI(<Input />)

		const input = bySlot(container, 'input')

		expect(input).toBeInTheDocument()

		expect(input?.tagName).toBe('INPUT')
	})

	it('applies custom className', () => {
		const { container } = renderUI(<Input className="custom" />)

		const input = bySlot(container, 'input')

		expect(input?.className).toContain('custom')
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
	// Each size variant brings a unique text class via ji.size; matching it
	// confirms which size the kata actually rendered.
	const textClassFor = {
		sm: 'text-sm/5',
		md: 'text-base/6',
		lg: 'text-lg/7',
	} as const

	it('inherits size from <Concentric> when no explicit prop is set', () => {
		const { container } = renderUI(
			<Concentric size="lg">
				<Input />
			</Concentric>,
		)

		expect(bySlot(container, 'input')?.className).toContain(textClassFor.lg)
	})

	it('explicit size prop overrides <Concentric> inheritance', () => {
		const { container } = renderUI(
			<Concentric size="lg">
				<Input size="sm" />
			</Concentric>,
		)

		expect(bySlot(container, 'input')?.className).toContain(textClassFor.sm)
	})

	it('falls back to "md" outside any size context', () => {
		const { container } = renderUI(<Input />)

		expect(bySlot(container, 'input')?.className).toContain(textClassFor.md)
	})
})
