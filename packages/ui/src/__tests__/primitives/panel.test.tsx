import { renderHook } from '@testing-library/react'
import type { ReactElement } from 'react'
import { describe, expect, it, vi } from 'vitest'
import { createPanel, PanelA11yContext, PanelClose, usePanelA11y } from '../../primitives/panel'
import { DensityProvider } from '../../providers/density'
import { bySlot, renderUI } from '../helpers'

describe('createPanel', () => {
	const { Title, Description, Header, Body, Footer, Content } = createPanel('dialog')

	it.each<[string, () => ReactElement, string, string]>([
		['Title renders with correct data-slot', () => <Title>My Title</Title>, 'dialog-title', 'H2'],
		[
			'Description renders with correct data-slot',
			() => <Description>My Description</Description>,
			'dialog-description',
			'P',
		],
		[
			'Header renders with correct data-slot',
			() => <Header>Header content</Header>,
			'dialog-header',
			'DIV',
		],
		['Body renders with correct data-slot', () => <Body>Body content</Body>, 'dialog-body', 'DIV'],
		[
			'Footer renders with correct data-slot',
			() => <Footer>footer buttons</Footer>,
			'dialog-footer',
			'DIV',
		],
		[
			'Content renders with correct data-slot',
			() => <Content>content area</Content>,
			'dialog-content',
			'DIV',
		],
	])('%s', (_name, ui, slot, tagName) => {
		const { container } = renderUI(ui())

		const el = bySlot(container, slot)

		expect(el).toBeInTheDocument()

		expect(el?.tagName).toBe(tagName)
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

	it.each<[string, () => ReactElement, string]>([
		['Title holds the text-lg baseline at neutral density', () => <Title>Title</Title>, 'text-lg'],
		[
			'Title shifts down one rung under compact density',
			() => (
				<DensityProvider density="compact">
					<Title>Title</Title>
				</DensityProvider>
			),
			'text-base',
		],
		[
			'Title shifts up one rung under loose density',
			() => (
				<DensityProvider density="loose">
					<Title>Title</Title>
				</DensityProvider>
			),
			'text-xl',
		],
		[
			'Title weight is sourced from the heading scale (h2 → semibold)',
			() => <Title>Title</Title>,
			'font-semibold',
		],
	])('%s', (_name, ui, className) => {
		const { container } = renderUI(ui())

		expect(bySlot(container, 'dialog-title')?.className).toContain(className)
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
