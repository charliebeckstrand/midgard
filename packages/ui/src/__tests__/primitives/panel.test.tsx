import { renderHook } from '@testing-library/react'
import type { ReactElement } from 'react'
import { describe, expect, it, vi } from 'vitest'
import { createPanel, PanelClose, usePanelA11y } from '../../primitives/panel'
import { PanelA11yContext } from '../../primitives/panel/panel-providers'
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
		[
			'Title sizes on the title ramp, which follows the nearest scope',
			() => <Title>Title</Title>,
			'density-text-[sm,base,lg,xl,2xl]',
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
