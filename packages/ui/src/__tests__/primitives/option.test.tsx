import { createContext, type FC, Profiler, type ReactNode, use } from 'react'
import { beforeEach, describe, expect, it, vi } from 'vitest'
import { createSelectOption, Option } from '../../primitives/option/option'
import { bySlot, fireEvent, renderUI, screen } from '../helpers'

describe('Option', () => {
	it('sets aria-selected when selected', () => {
		renderUI(
			<Option selected={true} onSelect={() => {}}>
				Option
			</Option>,
		)

		const el = screen.getByRole('option')

		expect(el).toHaveAttribute('aria-selected', 'true')
	})

	it('sets aria-disabled when disabled', () => {
		renderUI(
			<Option selected={false} disabled onSelect={() => {}}>
				Option
			</Option>,
		)

		const el = screen.getByRole('option')

		expect(el).toHaveAttribute('aria-disabled', 'true')
	})

	it('calls onSelect on click', () => {
		const onSelect = vi.fn()

		renderUI(
			<Option selected={false} onSelect={onSelect}>
				Option
			</Option>,
		)

		fireEvent.click(screen.getByRole('option'))

		expect(onSelect).toHaveBeenCalledOnce()
	})

	it('does not call onSelect when disabled', () => {
		const onSelect = vi.fn()

		renderUI(
			<Option selected={false} disabled onSelect={onSelect}>
				Option
			</Option>,
		)

		fireEvent.click(screen.getByRole('option'))

		expect(onSelect).not.toHaveBeenCalled()
	})

	it('selects on Enter key', () => {
		const onSelect = vi.fn()

		renderUI(
			<Option selected={false} onSelect={onSelect}>
				Option
			</Option>,
		)

		fireEvent.keyDown(screen.getByRole('option'), { key: 'Enter' })

		expect(onSelect).toHaveBeenCalledOnce()
	})

	it('selects on Space key', () => {
		const onSelect = vi.fn()

		renderUI(
			<Option selected={false} onSelect={onSelect}>
				Option
			</Option>,
		)

		fireEvent.keyDown(screen.getByRole('option'), { key: ' ' })

		expect(onSelect).toHaveBeenCalledOnce()
	})

	it('does not select when Enter is pressed and disabled', () => {
		const onSelect = vi.fn()

		renderUI(
			<Option selected={false} disabled onSelect={onSelect}>
				Option
			</Option>,
		)

		fireEvent.keyDown(screen.getByRole('option'), { key: 'Enter' })

		expect(onSelect).not.toHaveBeenCalled()
	})

	it('ignores keys other than Enter and Space', () => {
		const onSelect = vi.fn()

		renderUI(
			<Option selected={false} onSelect={onSelect}>
				Option
			</Option>,
		)

		fireEvent.keyDown(screen.getByRole('option'), { key: 'a' })

		expect(onSelect).not.toHaveBeenCalled()
	})

	it('runs a consumer onClick first, then selects', () => {
		const calls: string[] = []

		renderUI(
			<Option
				selected={false}
				onSelect={() => calls.push('select')}
				onClick={() => calls.push('consumer')}
			>
				Option
			</Option>,
		)

		fireEvent.click(screen.getByRole('option'))

		expect(calls).toEqual(['consumer', 'select'])
	})

	it('selects after a consumer preventDefault, on click and on Enter', () => {
		const onSelect = vi.fn()

		renderUI(
			<Option
				selected={false}
				onSelect={onSelect}
				onClick={(event) => event.preventDefault()}
				onKeyDown={(event) => event.preventDefault()}
			>
				Option
			</Option>,
		)

		const option = screen.getByRole('option')

		fireEvent.click(option)

		fireEvent.keyDown(option, { key: 'Enter' })

		expect(onSelect).toHaveBeenCalledTimes(2)
	})

	it('runs a consumer onMouseDown and still holds focus in an active-descendant list', () => {
		const onMouseDown = vi.fn()

		renderUI(
			<Option selected={false} onSelect={() => {}} activeDescendant onMouseDown={onMouseDown}>
				Option
			</Option>,
		)

		const held = fireEvent.mouseDown(screen.getByRole('option'))

		expect(onMouseDown).toHaveBeenCalledOnce()

		// `fireEvent` returns false when a handler canceled the event.
		expect(held).toBe(false)
	})

	it('renders the default check icon invisible until the row is selected', () => {
		const { container } = renderUI(
			<Option selected={false} onSelect={() => {}}>
				Option
			</Option>,
		)

		const cls = bySlot(container, 'icon')?.getAttribute('class') ?? ''

		expect(cls).toContain('invisible')

		expect(cls).toContain('group-data-selected/option:visible')
	})

	it('sizes the default check icon with a stepped class, which follows the nearest scope', () => {
		const { container } = renderUI(
			<Option selected={true} onSelect={() => {}}>
				Option
			</Option>,
		)

		expect(bySlot(container, 'icon')).toHaveClass('density-size-[4,4.5,5,5.5,6]')
	})
})

const mockSelect = vi.fn()

type TestSelection = {
	value: unknown
	multiple: boolean
	onSelect: (value: unknown) => void
	capitalize?: boolean
}

const SelectionContext = createContext<TestSelection>({
	value: undefined,
	multiple: false,
	onSelect: mockSelect,
})

const TestContext: FC<{
	children: ReactNode
	value?: unknown
	multiple?: boolean
	capitalize?: boolean
}> = ({ children, value, multiple, capitalize }) => (
	<SelectionContext
		value={{ value, multiple: multiple ?? false, onSelect: mockSelect, capitalize }}
	>
		{children}
	</SelectionContext>
)

const {
	Option: SelectOption,
	Label,
	Text,
	Description,
} = createSelectOption({
	slotPrefix: 'test',
	useSelection: () => use(SelectionContext),
})

describe('createSelectOption', () => {
	beforeEach(() => {
		mockSelect.mockClear()
	})

	it('Option renders with its data-slot', () => {
		const { container } = renderUI(
			<TestContext>
				<SelectOption value="a">Item A</SelectOption>
			</TestContext>,
		)

		const el = bySlot(container, 'test-option')

		expect(el).toBeInTheDocument()
	})

	it('Label renders with its data-slot', () => {
		const { container } = renderUI(
			<TestContext>
				<Label>My Label</Label>
			</TestContext>,
		)

		const el = bySlot(container, 'test-label')

		expect(el).toBeInTheDocument()

		expect(screen.getByText('My Label')).toBeInTheDocument()
	})

	it('Description renders with its data-slot', () => {
		const { container } = renderUI(
			<TestContext>
				<Description>My Desc</Description>
			</TestContext>,
		)

		const el = bySlot(container, 'test-description')

		expect(el).toBeInTheDocument()

		expect(screen.getByText('My Desc')).toBeInTheDocument()
	})

	it('Text renders with its data-slot and holds the label over the description', () => {
		const { container } = renderUI(
			<TestContext>
				<Text>
					<Label>My Label</Label>

					<Description>My Desc</Description>
				</Text>
			</TestContext>,
		)

		const el = bySlot(container, 'test-text')

		expect(el).toContainElement(bySlot(container, 'test-label'))

		expect(el).toContainElement(bySlot(container, 'test-description'))

		expect(el).toHaveClass('flex-col')
	})

	it('Label capitalizes a string label when the host asks for it', () => {
		renderUI(
			<TestContext capitalize>
				<SelectOption value="a">
					<Label>lower case</Label>
				</SelectOption>
			</TestContext>,
		)

		expect(screen.getByText('Lower case')).toBeInTheDocument()
	})

	it('Label does not re-render when only the selection changes', () => {
		const labelCommits = vi.fn()

		// The option children are created once, so a commit under a Profiler
		// comes from the Label itself and not from its parent.
		const options = ['a', 'b', 'c'].map((value) => (
			<SelectOption key={value} value={value}>
				<Profiler id={value} onRender={labelCommits}>
					<Label>{value}</Label>
				</Profiler>
			</SelectOption>
		))

		const { rerender } = renderUI(
			<TestContext value="a" capitalize>
				{options}
			</TestContext>,
		)

		labelCommits.mockClear()

		rerender(
			<TestContext value="b" capitalize>
				{options}
			</TestContext>,
		)

		expect(labelCommits).not.toHaveBeenCalled()

		expect(screen.getByRole('option', { name: 'B' })).toHaveAttribute('aria-selected', 'true')
	})
})
