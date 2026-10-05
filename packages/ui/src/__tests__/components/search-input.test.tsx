import { useState } from 'react'
import { describe, expect, it, vi } from 'vitest'
import { Form } from '../../components/form'
import { SearchInput } from '../../components/search-input'
import { bySlot, getSlot, renderUI, screen, setupUser } from '../helpers'
import { FieldProbe, getFieldProbe } from '../helpers/field-probe'

describe('SearchInput', () => {
	it('renders an input with data-slot="search-input" and a search icon prefix', () => {
		const { container } = renderUI(<SearchInput />)

		const input = bySlot(container, 'search-input')

		expect(input).toBeInTheDocument()

		expect(input?.tagName).toBe('INPUT')

		expect(container.querySelector('[data-slot="icon"]')).toBeInTheDocument()
	})

	it.each([
		['the field is read-only', () => <SearchInput defaultValue="query" readOnly />],
		['the field is disabled', () => <SearchInput defaultValue="query" disabled />],
		['the value is empty', () => <SearchInput value="" onClear={() => {}} onChange={() => {}} />],
		[
			'the field is loading',
			() => <SearchInput loading value="query" onClear={() => {}} onChange={() => {}} />,
		],
	])('does not show the clear button when %s', (_name, ui) => {
		renderUI(ui())

		expect(screen.queryByRole('button', { name: 'Clear search' })).not.toBeInTheDocument()
	})

	it('calls onClear when clear button is clicked', async () => {
		const onClear = vi.fn()

		renderUI(<SearchInput value="query" onClear={onClear} onChange={() => {}} />)

		const user = setupUser()

		await user.click(screen.getByRole('button', { name: 'Clear search' }))

		expect(onClear).toHaveBeenCalledOnce()
	})

	it('clears a controlled field when the clear button is clicked', async () => {
		// Clearing notifies the parent through onChange; setCurrentValue is a
		// no-op while controlled.
		function Controlled() {
			const [value, setValue] = useState('query')

			return <SearchInput value={value} onChange={(event) => setValue(event.target.value)} />
		}

		renderUI(<Controlled />)

		const input = screen.getByRole('searchbox') as HTMLInputElement

		expect(input.value).toBe('query')

		const user = setupUser()

		await user.click(screen.getByLabelText('Clear search'))

		expect(input.value).toBe('')
	})

	it('returns focus to the input after clearing (uncontrolled)', async () => {
		renderUI(<SearchInput defaultValue="query" />)

		const input = screen.getByRole('searchbox')

		const user = setupUser()

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

	it('fires onChange handler', async () => {
		const onChange = vi.fn()

		const { container } = renderUI(<SearchInput onChange={onChange} />)

		const input = getSlot<HTMLInputElement>(container, 'search-input')

		const user = setupUser()

		await user.type(input, 'a')

		expect(onChange).toHaveBeenCalled()
	})

	it('fires onClear when typing reduces the input to empty', async () => {
		const onClear = vi.fn()

		const { container } = renderUI(<SearchInput defaultValue="abc" onClear={onClear} />)

		const input = getSlot<HTMLInputElement>(container, 'search-input')

		const user = setupUser()

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

		const input = getSlot<HTMLInputElement>(container, 'search-input')

		const user = setupUser()

		await user.type(input, 'midgard')

		await user.click(screen.getByRole('button', { name: 'Submit' }))

		expect(onSubmit).toHaveBeenCalledWith(
			expect.objectContaining({ q: 'midgard' }),
			expect.anything(),
		)
	})

	it('marks the form field touched on blur', async () => {
		const { container } = renderUI(
			<Form defaultValues={{ q: '' }}>
				<SearchInput name="q" />
				<FieldProbe name="q" />
			</Form>,
		)

		const input = getSlot<HTMLInputElement>(container, 'search-input')

		const user = setupUser()

		await user.click(input)

		expect(getFieldProbe('q')).toHaveAttribute('data-touched', 'false')

		await user.tab()

		expect(getFieldProbe('q')).toHaveAttribute('data-touched', 'true')
	})

	it.each([
		['false', false],
		['null', null],
	])('renders no suffix slot when the suffix is %s and the query is empty', (_name, suffix) => {
		const { container } = renderUI(<SearchInput suffix={suffix} />)

		expect(bySlot(container, 'suffix')).not.toBeInTheDocument()
	})
})
