import type React from 'react'
import { beforeEach, describe, expect, it, vi } from 'vitest'
import { createSelectOption } from '../../primitives/create-select-option'
import { bySlot, renderUI, screen } from '../helpers'

const mockSelect = vi.fn()

const TestContext: React.FC<{ children: React.ReactNode; value?: unknown; multiple?: boolean }> = ({
	children,
	value,
	multiple,
}) => {
	contextValue = { value, multiple: multiple ?? false, select: mockSelect }

	return <>{children}</>
}

let contextValue = { value: undefined as unknown, multiple: false, select: mockSelect }

const { Option, Label, Description } = createSelectOption({
	slotPrefix: 'test',
	useContext: () => contextValue,
})

describe('createSelectOption', () => {
	beforeEach(() => {
		mockSelect.mockClear()

		contextValue = { value: undefined, multiple: false, select: mockSelect }
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
