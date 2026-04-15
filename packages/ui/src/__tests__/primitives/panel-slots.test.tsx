import { renderHook } from '@testing-library/react'
import { describe, expect, it } from 'vitest'
import {
	createPanelSlots,
	PanelA11yProvider,
	useDescriptionRegistration,
	usePanelA11y,
} from '../../primitives/panel-slots'
import { bySlot, renderUI } from '../helpers'

describe('createPanelSlots', () => {
	const { Title, Description, Body, Actions } = createPanelSlots('dialog')

	it('Title renders with correct data-slot', () => {
		const { container } = renderUI(<Title>My Title</Title>)

		const el = bySlot(container, 'dialog-title')

		expect(el).toBeInTheDocument()

		expect(el?.tagName).toBe('H2')
	})

	it('Description renders with correct data-slot', () => {
		const { container } = renderUI(<Description>My Description</Description>)

		const el = bySlot(container, 'dialog-description')

		expect(el).toBeInTheDocument()

		expect(el?.tagName).toBe('P')
	})

	it('Body renders with correct data-slot', () => {
		const { container } = renderUI(<Body>Body content</Body>)

		const el = bySlot(container, 'dialog-body')

		expect(el).toBeInTheDocument()

		expect(el?.tagName).toBe('DIV')
	})

	it('Actions renders with correct data-slot', () => {
		const { container } = renderUI(<Actions>action buttons</Actions>)

		const el = bySlot(container, 'dialog-actions')

		expect(el).toBeInTheDocument()

		expect(el?.tagName).toBe('DIV')
	})

	it('Title applies custom className', () => {
		const { container } = renderUI(<Title className="custom">Title</Title>)

		const el = bySlot(container, 'dialog-title')

		expect(el?.className).toContain('custom')
	})

	it('Title uses titleId from context', () => {
		const { container } = renderUI(
			<PanelA11yProvider value={{ titleId: 'my-title' }}>
				<Title>Title</Title>
			</PanelA11yProvider>,
		)

		const el = bySlot(container, 'dialog-title')

		expect(el).toHaveAttribute('id', 'my-title')
	})
})

describe('usePanelA11y', () => {
	it('returns empty object outside provider', () => {
		const { result } = renderHook(() => usePanelA11y())

		expect(result.current).toEqual({})
	})
})

describe('useDescriptionRegistration', () => {
	it('starts with hasDescription false', () => {
		const { result } = renderHook(() => useDescriptionRegistration())

		expect(result.current.hasDescription).toBe(false)
	})
})
