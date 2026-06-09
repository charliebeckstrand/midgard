import { useState } from 'react'
import { describe, expect, it, vi } from 'vitest'
import { Form } from '../../components/form'
import { SearchInput } from '../../components/search-input'
import { bySlot, renderUI, screen, userEvent } from '../helpers'

describe('SearchInput', () => {
	it('renders an input with data-slot="search-input"', () => {
		const { container } = renderUI(<SearchInput />)

		const input = bySlot(container, 'search-input')

		expect(input).toBeInTheDocument()

		expect(input?.tagName).toBe('INPUT')
	})

	it('renders a search icon prefix', () => {
		const { container } = renderUI(<SearchInput />)

		expect(container.querySelector('[data-slot="icon"]')).toBeInTheDocument()
	})

	it('passes through placeholder', () => {
		const { container } = renderUI(<SearchInput placeholder="Search..." />)

		const input = bySlot(container, 'search-input')

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

	it('clears a controlled field when the clear button is clicked', async () => {
		// Regression: clearing must notify the parent through onChange, otherwise a
		// controlled field stays stuck showing the old value (setCurrentValue is a
		// no-op while controlled).
		function Controlled() {
			const [value, setValue] = useState('query')

			return <SearchInput value={value} onChange={(e) => setValue(e.target.value)} />
		}

		renderUI(<Controlled />)

		const input = screen.getByRole('searchbox') as HTMLInputElement

		expect(input.value).toBe('query')

		const user = userEvent.setup()

		await user.click(screen.getByLabelText('Clear search'))

		expect(input.value).toBe('')
	})

	it('returns focus to the input after clearing (uncontrolled)', async () => {
		renderUI(<SearchInput defaultValue="query" />)

		const input = screen.getByRole('searchbox')

		const user = userEvent.setup()

		await user.click(screen.getByLabelText('Clear search'))

		// The clear button unmounts once the field is empty; focus must return to
		// the input rather than falling to <body>.
		expect(screen.queryByLabelText('Clear search')).not.toBeInTheDocument()

		expect(input).toHaveFocus()
	})

	it('shows spinner when loading', () => {
		const { container } = renderUI(<SearchInput loading />)

		expect(bySlot(container, 'loading-spinner')).toBeInTheDocument()
	})

	it('does not show clear button when loading', () => {
		renderUI(<SearchInput loading value="query" onClear={() => {}} onChange={() => {}} />)

		expect(screen.queryByLabelText('Clear search')).not.toBeInTheDocument()
	})

	it('fires onChange handler', async () => {
		const onChange = vi.fn()

		const { container } = renderUI(<SearchInput onChange={onChange} />)

		const input = bySlot(container, 'search-input') as HTMLInputElement

		const user = userEvent.setup()

		await user.type(input, 'a')

		expect(onChange).toHaveBeenCalled()
	})

	it('renders a placeholder in skeleton mode', () => {
		const { container } = renderUI(<SearchInput />, { skeleton: true })

		expect(bySlot(container, 'search-input')).not.toBeInTheDocument()
		expect(bySlot(container, 'placeholder')).toBeInTheDocument()
	})

	it('fires onClear when typing reduces the input to empty', async () => {
		const onClear = vi.fn()

		const { container } = renderUI(<SearchInput defaultValue="abc" onClear={onClear} />)

		const input = bySlot(container, 'search-input') as HTMLInputElement

		const user = userEvent.setup()

		await user.clear(input)

		expect(onClear).toHaveBeenCalled()
	})

	it('binds to a Form field by name', async () => {
		const onSubmit = vi.fn()

		const { container } = renderUI(
			<Form defaultValues={{ q: '' }} onSubmit={onSubmit}>
				<SearchInput name="q" />
				<button type="submit">Submit</button>
			</Form>,
		)

		const input = bySlot(container, 'search-input') as HTMLInputElement

		const user = userEvent.setup()

		await user.type(input, 'midgard')

		await user.click(screen.getByRole('button', { name: 'Submit' }))

		expect(onSubmit).toHaveBeenCalledWith(
			expect.objectContaining({ q: 'midgard' }),
			expect.anything(),
		)
	})
})
