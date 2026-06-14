import { createContext, type FC, type ReactNode } from 'react'
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

	it('renders a custom icon when provided in place of the default check', () => {
		const { container } = renderUI(
			<BaseOption selected={true} icon={<svg data-testid="custom-icon" />} onSelect={() => {}}>
				Option
			</BaseOption>,
		)

		expect(container.querySelector('[data-testid="custom-icon"]')).toBeInTheDocument()
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
}

const SelectionContext = createContext<TestSelection>({
	value: undefined,
	multiple: false,
	onSelect: mockSelect,
})

const TestContext: FC<{ children: ReactNode; value?: unknown; multiple?: boolean }> = ({
	children,
	value,
	multiple,
}) => (
	<SelectionContext value={{ value, multiple: multiple ?? false, onSelect: mockSelect }}>
		{children}
	</SelectionContext>
)

const { Option, Label, Description } = createSelectOption({
	slotPrefix: 'test',
	context: SelectionContext,
})

describe('createSelectOption', () => {
	beforeEach(() => {
		mockSelect.mockClear()
	})

	it('Option renders with correct data-slot', () => {
		const { container } = renderUI(
			<TestContext>
				<Option value="a">Item A</Option>
			</TestContext>,
		)

		const el = bySlot(container, 'test-option')

		expect(el).toBeInTheDocument()
	})

	it('Label renders with correct data-slot', () => {
		const { container } = renderUI(
			<TestContext>
				<Label>My Label</Label>
			</TestContext>,
		)

		const el = bySlot(container, 'test-label')

		expect(el).toBeInTheDocument()

		expect(screen.getByText('My Label')).toBeInTheDocument()
	})

	it('Description renders with correct data-slot', () => {
		const { container } = renderUI(
			<TestContext>
				<Description>My Desc</Description>
			</TestContext>,
		)

		const el = bySlot(container, 'test-description')

		expect(el).toBeInTheDocument()

		expect(screen.getByText('My Desc')).toBeInTheDocument()
	})
})
