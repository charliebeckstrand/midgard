import { describe, expect, it, vi } from 'vitest'
import { Button } from '../../components/button'
import { Filters, FiltersClear, FiltersField, useFilters } from '../../components/filters'
import { Input } from '../../components/input'
import { bySlot, renderUI, screen, userEvent } from '../helpers'

describe('Filters group', () => {
	it('exposes the bar as a named role="group"', () => {
		renderUI(
			<Filters aria-label="Order filters">
				<FiltersField name="name">
					<Input />
				</FiltersField>
			</Filters>,
		)

		expect(screen.getByRole('group', { name: 'Order filters' })).toBeInTheDocument()
	})
})

describe('FiltersField', () => {
	it('injects value into child via cloneElement', () => {
		const { container } = renderUI(
			<Filters aria-label="Filters" value={{ name: 'hello' }} onValueChange={() => {}}>
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
			<Filters aria-label="Filters" value={{ name: '' }} onValueChange={onChange}>
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
			<Filters aria-label="Filters" value={{ name: '' }} onValueChange={onChange}>
				<FiltersField name="name">
					{({ value, onValueChange: fieldOnValueChange }) => (
						<input
							data-slot="raw-input"
							value={(value as string) ?? ''}
							onChange={(e) => fieldOnValueChange(e.target.value)}
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
})

describe('FiltersClear', () => {
	it('clears all filter values when clicked', async () => {
		const onChange = vi.fn()
		renderUI(
			<Filters
				aria-label="Filters"
				value={{ name: 'hello', status: 'active' }}
				onValueChange={onChange}
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
		expect(onChange).toHaveBeenCalledWith({})
	})

	it('resets to defaultValue when provided', async () => {
		const onChange = vi.fn()
		const defaults = { name: '', status: 'all' }
		renderUI(
			<Filters
				aria-label="Filters"
				value={{ name: 'hello', status: 'active' }}
				defaultValue={defaults}
				onValueChange={onChange}
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

	it('preserves the child element onClick alongside the clear behaviour', async () => {
		const onChange = vi.fn()

		const childClick = vi.fn()

		renderUI(
			<Filters aria-label="Filters" value={{ name: 'hello' }} onValueChange={onChange}>
				<FiltersClear>
					<Button onClick={childClick}>Clear</Button>
				</FiltersClear>
			</Filters>,
		)

		const user = userEvent.setup()

		await user.click(screen.getByText('Clear'))

		expect(childClick).toHaveBeenCalled()

		expect(onChange).toHaveBeenCalled()
	})

	it('merges the FiltersClear className into the child element', () => {
		renderUI(
			<Filters aria-label="Filters" value={{ name: 'hello' }}>
				<FiltersClear className="from-wrapper">
					<Button>Clear</Button>
				</FiltersClear>
			</Filters>,
		)

		const button = screen.getByText('Clear').closest('button')

		expect(button?.className).toContain('from-wrapper')
	})
})

describe('useFilters', () => {
	function ActiveCount() {
		const { activeCount } = useFilters()
		return <span data-slot="count">{activeCount}</span>
	}

	it('reports activeCount correctly', () => {
		const { container } = renderUI(
			<Filters aria-label="Filters" value={{ a: 'yes', b: '', c: undefined, d: [], e: [1] }}>
				<ActiveCount />
			</Filters>,
		)
		// 'yes' and [1] are active, '' and undefined and [] are not
		expect(bySlot(container, 'count')?.textContent).toBe('2')
	})

	it('reports 0 when all values are empty', () => {
		const { container } = renderUI(
			<Filters aria-label="Filters" value={{ a: '', b: undefined, c: null }}>
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
			<Filters aria-label="Filters" defaultValue={{ name: '' }}>
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

describe('Filters extras', () => {
	it('renders the prefix slot when provided', () => {
		const { container } = renderUI(
			<Filters aria-label="Filters" prefix={<span>prefix node</span>}>
				<span>child</span>
			</Filters>,
		)

		const prefix = bySlot(container, 'filters-prefix')

		expect(prefix).toBeInTheDocument()

		expect(prefix?.textContent).toBe('prefix node')
	})

	it('renders the suffix slot when provided', () => {
		const { container } = renderUI(
			<Filters aria-label="Filters" suffix={<span>suffix node</span>}>
				<span>child</span>
			</Filters>,
		)

		const suffix = bySlot(container, 'filters-suffix')

		expect(suffix).toBeInTheDocument()

		expect(suffix?.textContent).toBe('suffix node')
	})

	it('omits the prefix and suffix slots when not provided', () => {
		const { container } = renderUI(
			<Filters aria-label="Filters">
				<span>child</span>
			</Filters>,
		)

		expect(bySlot(container, 'filters-prefix')).toBeNull()

		expect(bySlot(container, 'filters-suffix')).toBeNull()
	})

	it('invokes onClear in addition to clearing values', async () => {
		const onClear = vi.fn()

		renderUI(
			<Filters aria-label="Filters" value={{ name: 'hello' }} onClear={onClear}>
				<FiltersClear>
					<Button>Clear</Button>
				</FiltersClear>
			</Filters>,
		)

		const user = userEvent.setup()

		await user.click(screen.getByText('Clear'))

		expect(onClear).toHaveBeenCalled()
	})

	it('renders the equal layout variant without error', () => {
		const { container } = renderUI(
			<Filters aria-label="Filters" equal>
				<FiltersField name="a">
					<Input />
				</FiltersField>
				<FiltersField name="b">
					<Input />
				</FiltersField>
			</Filters>,
		)

		expect(bySlot(container, 'filters')).toBeInTheDocument()
	})

	it('removes a key from the value when the field is set to an empty/inactive value', async () => {
		const onChange = vi.fn()

		const { container } = renderUI(
			<Filters aria-label="Filters" defaultValue={{ name: 'hello' }} onValueChange={onChange}>
				<FiltersField name="name">
					<Input />
				</FiltersField>
			</Filters>,
		)

		const input = bySlot(container, 'input') as HTMLInputElement

		const user = userEvent.setup()

		await user.clear(input)

		// Empty string is inactive — Filters should drop `name` from the value object.
		expect(onChange).toHaveBeenCalled()

		const lastCall = onChange.mock.calls[onChange.mock.calls.length - 1] as [
			Record<string, unknown>,
		]

		expect(Object.hasOwn(lastCall[0], 'name')).toBe(false)
	})
})
