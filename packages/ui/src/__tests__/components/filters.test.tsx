import { describe, expect, it, vi } from 'vitest'
import { Button } from '../../components/button'
import { Filters, FiltersClear, FiltersField, useFilters } from '../../components/filters'
import { Input } from '../../components/input'
import { bySlot, renderUI, screen, userEvent } from '../helpers'

describe('Filter', () => {
	it('renders with data-slot="filters"', () => {
		const { container } = renderUI(
			<Filters>
				<span>content</span>
			</Filters>,
		)
		expect(bySlot(container, 'filters')).toBeInTheDocument()
	})

	it('renders children', () => {
		renderUI(
			<Filters>
				<span>Hello</span>
			</Filters>,
		)
		expect(screen.getByText('Hello')).toBeInTheDocument()
	})

	it('applies custom className', () => {
		const { container } = renderUI(
			<Filters className="custom">
				<span>content</span>
			</Filters>,
		)
		expect(bySlot(container, 'filters')?.className).toContain('custom')
	})
})

describe('FiltersField', () => {
	it('renders with data-slot="filter-field"', () => {
		const { container } = renderUI(
			<Filters value={{ name: '' }} onChange={() => {}}>
				<FiltersField name="name">
					<Input />
				</FiltersField>
			</Filters>,
		)
		expect(bySlot(container, 'filter-field')).toBeInTheDocument()
	})

	it('injects value into child via cloneElement', () => {
		const { container } = renderUI(
			<Filters value={{ name: 'hello' }} onChange={() => {}}>
				<FiltersField name="name">
					<Input />
				</FiltersField>
			</Filters>,
		)
		const input = bySlot(container, 'input') as HTMLInputElement
		expect(input.value).toBe('hello')
	})

	it('calls onChange when input changes (auto-binding)', async () => {
		const onChange = vi.fn()
		const { container } = renderUI(
			<Filters value={{ name: '' }} onChange={onChange}>
				<FiltersField name="name">
					<Input />
				</FiltersField>
			</Filters>,
		)
		const input = bySlot(container, 'input') as HTMLInputElement
		const user = userEvent.setup()
		await user.type(input, 'a')
		expect(onChange).toHaveBeenCalledWith(expect.objectContaining({ name: 'a' }))
	})

	it('supports render prop children', async () => {
		const onChange = vi.fn()
		const { container } = renderUI(
			<Filters value={{ name: '' }} onChange={onChange}>
				<FiltersField name="name">
					{({ value, onChange: fieldOnChange }) => (
						<input
							data-slot="raw-input"
							value={(value as string) ?? ''}
							onChange={(e) => fieldOnChange(e.target.value)}
						/>
					)}
				</FiltersField>
			</Filters>,
		)
		const input = bySlot(container, 'raw-input') as HTMLInputElement
		const user = userEvent.setup()
		await user.type(input, 'b')
		expect(onChange).toHaveBeenCalledWith(expect.objectContaining({ name: 'b' }))
	})

	it('applies custom className', () => {
		const { container } = renderUI(
			<Filters>
				<FiltersField name="name" className="custom-field">
					<Input />
				</FiltersField>
			</Filters>,
		)
		expect(bySlot(container, 'filter-field')?.className).toContain('custom-field')
	})
})

describe('FiltersClear', () => {
	it('clears all filter values when clicked', async () => {
		const onChange = vi.fn()
		renderUI(
			<Filters value={{ name: 'hello', status: 'active' }} onChange={onChange}>
				<FiltersField name="name">
					<Input />
				</FiltersField>
				<FiltersClear>
					<Button>Clear</Button>
				</FiltersClear>
			</Filters>,
		)
		const user = userEvent.setup()
		await user.click(screen.getByText('Clear'))
		expect(onChange).toHaveBeenCalledWith({ name: undefined, status: undefined })
	})

	it('resets to defaultValue when provided', async () => {
		const onChange = vi.fn()
		const defaults = { name: '', status: 'all' }
		renderUI(
			<Filters
				value={{ name: 'hello', status: 'active' }}
				defaultValue={defaults}
				onChange={onChange}
			>
				<FiltersField name="name">
					<Input />
				</FiltersField>
				<FiltersClear>
					<Button>Clear</Button>
				</FiltersClear>
			</Filters>,
		)
		const user = userEvent.setup()
		await user.click(screen.getByText('Clear'))
		expect(onChange).toHaveBeenCalledWith(defaults)
	})
})

describe('useFilters', () => {
	function ActiveCount() {
		const { activeCount } = useFilters()
		return <span data-slot="count">{activeCount}</span>
	}

	it('reports activeCount correctly', () => {
		const { container } = renderUI(
			<Filters value={{ a: 'yes', b: '', c: undefined, d: [], e: [1] }}>
				<ActiveCount />
			</Filters>,
		)
		// 'yes' and [1] are active, '' and undefined and [] are not
		expect(bySlot(container, 'count')?.textContent).toBe('2')
	})

	it('reports 0 when all values are empty', () => {
		const { container } = renderUI(
			<Filters value={{ a: '', b: undefined, c: null }}>
				<ActiveCount />
			</Filters>,
		)
		expect(bySlot(container, 'count')?.textContent).toBe('0')
	})
})

describe('Filter (uncontrolled)', () => {
	it('manages state internally with defaultValue', async () => {
		function ActiveCount() {
			const { activeCount } = useFilters()
			return <span data-slot="count">{activeCount}</span>
		}

		const { container } = renderUI(
			<Filters defaultValue={{ name: '' }}>
				<FiltersField name="name">
					<Input />
				</FiltersField>
				<ActiveCount />
			</Filters>,
		)
		const input = bySlot(container, 'input') as HTMLInputElement
		const user = userEvent.setup()
		await user.type(input, 'test')
		expect(bySlot(container, 'count')?.textContent).toBe('1')
	})
})
