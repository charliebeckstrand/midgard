import { describe, expect, it, vi } from 'vitest'
import { Input } from '../../components/input'
import {
	bySlot,
	describeDensityContract,
	expectSlot,
	itForwardsRef,
	itRendersSkeletonPlaceholder,
	renderUI,
	userEvent,
} from '../helpers'

describe('Input', () => {
	it('renders an input with data-slot="input"', () => {
		const { container } = renderUI(<Input />)

		expectSlot(container, 'input', 'input')
	})

	itForwardsRef<HTMLInputElement>((ref) => <Input ref={ref} />, 'input')

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

	itRendersSkeletonPlaceholder(<Input />, 'input')
})

describeDensityContract('Input size resolution', {
	render: (size) => <Input size={size} />,
	slot: 'input',
	// Each size variant brings a unique text class via ji; matching it
	// confirms which size the kata actually rendered.
	classFor: { sm: 'text-sm', md: 'text-base', lg: 'text-lg' },
})
