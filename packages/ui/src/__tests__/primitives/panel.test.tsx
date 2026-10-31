import { renderHook } from '@testing-library/react'
import type { ReactElement } from 'react'
import { describe, expect, it, vi } from 'vitest'
import { createPanel, PanelClose, usePanelA11y } from '../../primitives/panel'
import { PanelA11yContext } from '../../primitives/panel/context'
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

	it('Body keeps its anchor, which the resize floor of a sheet or a drawer selects', () => {
		const { container } = renderUI(<Body data-slot="custom-body">Body content</Body>)

		expect(bySlot(container, 'dialog-body')).toBeInTheDocument()
	})

	it('Footer keeps the mark that the default footer looks for', () => {
		const { container } = renderUI(<Footer data-panel-footer="custom">footer buttons</Footer>)

		expect(bySlot(container, 'dialog-footer')).toHaveAttribute('data-panel-footer', '')
	})

	it('Title applies custom className', () => {
		const { container } = renderUI(<Title className="custom">Title</Title>)

		const title = bySlot(container, 'dialog-title')

		expect(title?.className).toContain('custom')
	})

	it('Title uses titleId from context', () => {
		const { container } = renderUI(
			<PanelA11yContext value={{ titleId: 'my-title' }}>
				<Title>Title</Title>
			</PanelA11yContext>,
		)

		const title = bySlot(container, 'dialog-title')

		expect(title).toHaveAttribute('id', 'my-title')
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
