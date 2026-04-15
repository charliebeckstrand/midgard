import { describe, expect, it, vi } from 'vitest'
import { SearchInput } from '../../components/search-input'
import { bySlot, renderUI, screen, userEvent } from '../helpers'

describe('SearchInput', () => {
	it('renders an input with data-slot="input"', () => {
		const { container } = renderUI(<SearchInput />)

		const input = bySlot(container, 'input')

		expect(input).toBeInTheDocument()

		expect(input?.tagName).toBe('INPUT')
	})

	it('renders a search icon prefix', () => {
		const { container } = renderUI(<SearchInput />)

		expect(container.querySelector('[data-slot="icon"]')).toBeInTheDocument()
	})

	it('applies custom className', () => {
		const { container } = renderUI(<SearchInput className="custom" />)

		const input = bySlot(container, 'input')

		expect(input?.className).toContain('custom')
	})

	it('passes through placeholder', () => {
		const { container } = renderUI(<SearchInput placeholder="Search..." />)

		const input = bySlot(container, 'input')

		expect(input).toHaveAttribute('placeholder', 'Search...')
	})

	it('shows clear button when value is non-empty and onClear is provided', () => {
		renderUI(<SearchInput value="query" onClear={() => {}} onChange={() => {}} />)

		expect(screen.getByLabelText('Clear search')).toBeInTheDocument()
	})

	it('does not show clear button when value is empty', () => {
		renderUI(<SearchInput value="" onClear={() => {}} onChange={() => {}} />)

		expect(screen.queryByLabelText('Clear search')).not.toBeInTheDocument()
	})

	it('calls onClear when clear button is clicked', async () => {
		const onClear = vi.fn()

		renderUI(<SearchInput value="query" onClear={onClear} onChange={() => {}} />)

		const user = userEvent.setup()

		await user.click(screen.getByLabelText('Clear search'))

		expect(onClear).toHaveBeenCalledOnce()
	})

	it('shows spinner when loading', () => {
		const { container } = renderUI(<SearchInput loading />)

		expect(bySlot(container, 'spinner')).toBeInTheDocument()
	})

	it('does not show clear button when loading', () => {
		renderUI(<SearchInput loading value="query" onClear={() => {}} onChange={() => {}} />)

		expect(screen.queryByLabelText('Clear search')).not.toBeInTheDocument()
	})

	it('fires onChange handler', async () => {
		const onChange = vi.fn()

		const { container } = renderUI(<SearchInput onChange={onChange} />)

		const input = bySlot(container, 'input') as HTMLInputElement

		const user = userEvent.setup()

		await user.type(input, 'a')

		expect(onChange).toHaveBeenCalled()
	})

	it('renders a placeholder in skeleton mode', () => {
		const { container } = renderUI(<SearchInput />, { skeleton: true })

		expect(bySlot(container, 'input')).not.toBeInTheDocument()
		expect(bySlot(container, 'placeholder')).toBeInTheDocument()
	})
})
