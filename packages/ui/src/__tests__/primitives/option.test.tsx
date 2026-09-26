import { createContext, type FC, Profiler, type ReactNode, use } from 'react'
import { beforeEach, describe, expect, it, vi } from 'vitest'
import { Density } from '../../primitives/density'
import { BaseOption, createSelectOption } from '../../primitives/option'
import { bySlot, fireEvent, renderUI, screen } from '../helpers'

describe('BaseOption', () => {
	it('renders with role="option"', () => {
		renderUI(
			<BaseOption selected={false} onSelect={() => {}}>
				Option
			</BaseOption>,
		)

		const el = screen.getByRole('option')

		expect(el).toBeInTheDocument()
	})

	it('sets aria-selected when selected', () => {
		renderUI(
			<BaseOption selected={true} onSelect={() => {}}>
				Option
			</BaseOption>,
		)

		const el = screen.getByRole('option')

		expect(el).toHaveAttribute('aria-selected', 'true')
	})

	it('sets aria-disabled when disabled', () => {
		renderUI(
			<BaseOption selected={false} disabled onSelect={() => {}}>
				Option
			</BaseOption>,
		)

		const el = screen.getByRole('option')

		expect(el).toHaveAttribute('aria-disabled', 'true')
	})

	it('calls onSelect on click', () => {
		const onSelect = vi.fn()

		renderUI(
			<BaseOption selected={false} onSelect={onSelect}>
				Option
			</BaseOption>,
		)

		fireEvent.click(screen.getByRole('option'))

		expect(onSelect).toHaveBeenCalledOnce()
	})

	it('does not call onSelect when disabled', () => {
		const onSelect = vi.fn()

		renderUI(
			<BaseOption selected={false} disabled onSelect={onSelect}>
				Option
			</BaseOption>,
		)

		fireEvent.click(screen.getByRole('option'))

		expect(onSelect).not.toHaveBeenCalled()
	})

	it('selects on Enter key', () => {
		const onSelect = vi.fn()

		renderUI(
			<BaseOption selected={false} onSelect={onSelect}>
				Option
			</BaseOption>,
		)

		fireEvent.keyDown(screen.getByRole('option'), { key: 'Enter' })

		expect(onSelect).toHaveBeenCalledOnce()
	})

	it('selects on Space key', () => {
		const onSelect = vi.fn()

		renderUI(
			<BaseOption selected={false} onSelect={onSelect}>
				Option
			</BaseOption>,
		)

		fireEvent.keyDown(screen.getByRole('option'), { key: ' ' })

		expect(onSelect).toHaveBeenCalledOnce()
	})

	it('does not select when Enter is pressed and disabled', () => {
		const onSelect = vi.fn()

		renderUI(
			<BaseOption selected={false} disabled onSelect={onSelect}>
				Option
			</BaseOption>,
		)

		fireEvent.keyDown(screen.getByRole('option'), { key: 'Enter' })

		expect(onSelect).not.toHaveBeenCalled()
	})

	it('ignores keys other than Enter and Space', () => {
		const onSelect = vi.fn()

		renderUI(
			<BaseOption selected={false} onSelect={onSelect}>
				Option
			</BaseOption>,
		)

		fireEvent.keyDown(screen.getByRole('option'), { key: 'a' })

		expect(onSelect).not.toHaveBeenCalled()
	})

	it('renders the default check icon hidden until the row is selected', () => {
		const { container } = renderUI(
			<BaseOption selected={false} onSelect={() => {}}>
				Option
			</BaseOption>,
		)

		const cls = bySlot(container, 'icon')?.getAttribute('class') ?? ''

		expect(cls).toContain('hidden')

		expect(cls).toContain('group-data-selected/option:inline')
	})

	it('sizes the default check icon to the ambient density', () => {
		const { container } = renderUI(
			<Density size="lg">
				<BaseOption selected={true} onSelect={() => {}}>
					Option
				</BaseOption>
			</Density>,
		)

		expect(bySlot(container, 'icon')?.getAttribute('class')).toContain('size-6')
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

const { Option, Label, Description } = createSelectOption({
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
				<Option value="a">Item A</Option>
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

	it('Label capitalizes a string label when the host asks for it', () => {
		renderUI(
			<TestContext capitalize>
				<Option value="a">
					<Label>lower case</Label>
				</Option>
			</TestContext>,
		)

		expect(screen.getByText('Lower case')).toBeInTheDocument()
	})

	it('Label does not re-render when only the selection changes', () => {
		const labelCommits = vi.fn()

		// The option children are created once, so a commit under a Profiler
		// comes from the Label itself and not from its parent.
		const options = ['a', 'b', 'c'].map((value) => (
			<Option key={value} value={value}>
				<Profiler id={value} onRender={labelCommits}>
					<Label>{value}</Label>
				</Profiler>
			</Option>
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
