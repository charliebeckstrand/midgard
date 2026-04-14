import { describe, expect, it, vi } from 'vitest'
import { Button } from '../../components/button'
import { Filter, FilterClear, FilterField, useFilter } from '../../components/filter'
import { Input } from '../../components/input'
import { bySlot, renderUI, screen, userEvent } from '../helpers'

describe('Filter', () => {
	it('renders with data-slot="filter"', () => {
		const { container } = renderUI(
			<Filter>
				<span>content</span>
			</Filter>,
		)
		expect(bySlot(container, 'filter')).toBeInTheDocument()
	})

	it('renders children', () => {
		renderUI(
			<Filter>
				<span>Hello</span>
			</Filter>,
		)
		expect(screen.getByText('Hello')).toBeInTheDocument()
	})

	it('applies custom className', () => {
		const { container } = renderUI(
			<Filter className="custom">
				<span>content</span>
			</Filter>,
		)
		expect(bySlot(container, 'filter')?.className).toContain('custom')
	})
})

describe('FilterField', () => {
	it('renders with data-slot="filter-field"', () => {
		const { container } = renderUI(
			<Filter value={{ name: '' }} onChange={() => {}}>
				<FilterField name="name">
					<Input />
				</FilterField>
			</Filter>,
		)
		expect(bySlot(container, 'filter-field')).toBeInTheDocument()
	})

	it('injects value into child via cloneElement', () => {
		const { container } = renderUI(
			<Filter value={{ name: 'hello' }} onChange={() => {}}>
				<FilterField name="name">
					<Input />
				</FilterField>
			</Filter>,
		)
		const input = bySlot(container, 'input') as HTMLInputElement
		expect(input.value).toBe('hello')
	})

	it('calls onChange when input changes (auto-binding)', async () => {
		const onChange = vi.fn()
		const { container } = renderUI(
			<Filter value={{ name: '' }} onChange={onChange}>
				<FilterField name="name">
					<Input />
				</FilterField>
			</Filter>,
		)
		const input = bySlot(container, 'input') as HTMLInputElement
		const user = userEvent.setup()
		await user.type(input, 'a')
		expect(onChange).toHaveBeenCalledWith(expect.objectContaining({ name: 'a' }))
	})

	it('supports render prop children', async () => {
		const onChange = vi.fn()
		const { container } = renderUI(
			<Filter value={{ name: '' }} onChange={onChange}>
				<FilterField name="name">
					{({ value, onChange: fieldOnChange }) => (
						<input
							data-slot="raw-input"
							value={(value as string) ?? ''}
							onChange={(e) => fieldOnChange(e.target.value)}
						/>
					)}
				</FilterField>
			</Filter>,
		)
		const input = bySlot(container, 'raw-input') as HTMLInputElement
		const user = userEvent.setup()
		await user.type(input, 'b')
		expect(onChange).toHaveBeenCalledWith(expect.objectContaining({ name: 'b' }))
	})

	it('applies custom className', () => {
		const { container } = renderUI(
			<Filter>
				<FilterField name="name" className="custom-field">
					<Input />
				</FilterField>
			</Filter>,
		)
		expect(bySlot(container, 'filter-field')?.className).toContain('custom-field')
	})
})

describe('FilterClear', () => {
	it('clears all filter values when clicked', async () => {
		const onChange = vi.fn()
		renderUI(
			<Filter value={{ name: 'hello', status: 'active' }} onChange={onChange}>
				<FilterField name="name">
					<Input />
				</FilterField>
				<FilterClear>
					<Button>Clear</Button>
				</FilterClear>
			</Filter>,
		)
		const user = userEvent.setup()
		await user.click(screen.getByText('Clear'))
		expect(onChange).toHaveBeenCalledWith({ name: undefined, status: undefined })
	})

	it('resets to defaultValue when provided', async () => {
		const onChange = vi.fn()
		const defaults = { name: '', status: 'all' }
		renderUI(
			<Filter
				value={{ name: 'hello', status: 'active' }}
				defaultValue={defaults}
				onChange={onChange}
			>
				<FilterField name="name">
					<Input />
				</FilterField>
				<FilterClear>
					<Button>Clear</Button>
				</FilterClear>
			</Filter>,
		)
		const user = userEvent.setup()
		await user.click(screen.getByText('Clear'))
		expect(onChange).toHaveBeenCalledWith(defaults)
	})
})

describe('useFilter', () => {
	function ActiveCount() {
		const { activeCount } = useFilter()
		return <span data-slot="count">{activeCount}</span>
	}

	it('reports activeCount correctly', () => {
		const { container } = renderUI(
			<Filter value={{ a: 'yes', b: '', c: undefined, d: [], e: [1] }}>
				<ActiveCount />
			</Filter>,
		)
		// 'yes' and [1] are active, '' and undefined and [] are not
		expect(bySlot(container, 'count')?.textContent).toBe('2')
	})

	it('reports 0 when all values are empty', () => {
		const { container } = renderUI(
			<Filter value={{ a: '', b: undefined, c: null }}>
				<ActiveCount />
			</Filter>,
		)
		expect(bySlot(container, 'count')?.textContent).toBe('0')
	})
})

describe('Filter (uncontrolled)', () => {
	it('manages state internally with defaultValue', async () => {
		function ActiveCount() {
			const { activeCount } = useFilter()
			return <span data-slot="count">{activeCount}</span>
		}

		const { container } = renderUI(
			<Filter defaultValue={{ name: '' }}>
				<FilterField name="name">
					<Input />
				</FilterField>
				<ActiveCount />
			</Filter>,
		)
		const input = bySlot(container, 'input') as HTMLInputElement
		const user = userEvent.setup()
		await user.type(input, 'test')
		expect(bySlot(container, 'count')?.textContent).toBe('1')
	})
})
