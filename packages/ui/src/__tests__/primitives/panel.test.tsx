import { renderHook } from '@testing-library/react'
import { describe, expect, it, vi } from 'vitest'
import { createPanel, PanelA11yContext, PanelClose, usePanelA11y } from '../../primitives/panel'
import { DensityProvider } from '../../providers/density'
import { bySlot, renderUI } from '../helpers'

describe('createPanel', () => {
	const { Title, Description, Header, Body, Footer, Content } = createPanel('dialog')

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

	it('Header renders with correct data-slot', () => {
		const { container } = renderUI(<Header>Header content</Header>)

		const el = bySlot(container, 'dialog-header')

		expect(el).toBeInTheDocument()

		expect(el?.tagName).toBe('DIV')
	})

	it('Body renders with correct data-slot', () => {
		const { container } = renderUI(<Body>Body content</Body>)

		const el = bySlot(container, 'dialog-body')

		expect(el).toBeInTheDocument()

		expect(el?.tagName).toBe('DIV')
	})

	it('Footer renders with correct data-slot', () => {
		const { container } = renderUI(<Footer>footer buttons</Footer>)

		const el = bySlot(container, 'dialog-footer')

		expect(el).toBeInTheDocument()

		expect(el?.tagName).toBe('DIV')
	})

	it('Content renders with correct data-slot', () => {
		const { container } = renderUI(<Content>content area</Content>)

		const el = bySlot(container, 'dialog-content')

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
			<PanelA11yContext value={{ titleId: 'my-title' }}>
				<Title>Title</Title>
			</PanelA11yContext>,
		)

		const el = bySlot(container, 'dialog-title')

		expect(el).toHaveAttribute('id', 'my-title')
	})

	it('Title holds the text-lg baseline at neutral density', () => {
		const { container } = renderUI(<Title>Title</Title>)

		expect(bySlot(container, 'dialog-title')?.className).toContain('text-lg')
	})

	it('Title shifts down one rung under compact density', () => {
		const { container } = renderUI(
			<DensityProvider density="compact">
				<Title>Title</Title>
			</DensityProvider>,
		)

		expect(bySlot(container, 'dialog-title')?.className).toContain('text-base')
	})

	it('Title shifts up one rung under loose density', () => {
		const { container } = renderUI(
			<DensityProvider density="loose">
				<Title>Title</Title>
			</DensityProvider>,
		)

		expect(bySlot(container, 'dialog-title')?.className).toContain('text-xl')
	})

	it('Title weight is sourced from the heading scale (h2 → semibold)', () => {
		const { container } = renderUI(<Title>Title</Title>)

		expect(bySlot(container, 'dialog-title')?.className).toContain('font-semibold')
	})
})

describe('usePanelA11y', () => {
	it('returns empty object outside provider', () => {
		const { result } = renderHook(() => usePanelA11y())

		expect(result.current).toEqual({})
	})
})

describe('PanelClose', () => {
	it('throws a descriptive error when rendered outside a modal panel root', () => {
		vi.spyOn(console, 'error').mockImplementation(() => {})

		expect(() =>
			renderUI(
				<PanelClose>
					<button type="button">Close</button>
				</PanelClose>,
			),
		).toThrow('PanelClose must be rendered inside a Dialog, Sheet, or Drawer')
	})
})
