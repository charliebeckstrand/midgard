import { describe, expect, it } from 'vitest'
import { Divider } from '../../components/divider'
import { bySlot, renderUI, screen } from '../helpers'

describe('Divider', () => {
	it('renders with data-slot="divider"', () => {
		const { container } = renderUI(<Divider />)

		const el = bySlot(container, 'divider')

		expect(el).toBeInTheDocument()

		expect(el?.tagName).toBe('HR')
	})

	it('keeps the implicit separator role and sets aria-orientation for vertical dividers', () => {
		const { container } = renderUI(<Divider orientation="vertical" />)

		const el = bySlot(container, 'divider')

		// The native <hr> is a separator; an explicit role on it is redundant.
		expect(el).not.toHaveAttribute('role')

		expect(screen.getByRole('separator')).toBe(el)

		expect(el).toHaveAttribute('aria-orientation', 'vertical')
	})

	it('does not set role for horizontal dividers', () => {
		const { container } = renderUI(<Divider orientation="horizontal" />)

		const el = bySlot(container, 'divider')

		expect(el).not.toHaveAttribute('role')
	})

	it('keeps the computed role and aria-orientation when a consumer supplies them', () => {
		const { container } = renderUI(
			<Divider orientation="vertical" role="presentation" aria-orientation="horizontal" />,
		)

		const el = bySlot(container, 'divider')

		// §3.9: the role and the widget ARIA state are load-bearing, so the vertical
		// separator semantics stay. The component drops the consumer role.
		expect(el).not.toHaveAttribute('role')

		expect(screen.getByRole('separator')).toBe(el)

		expect(el).toHaveAttribute('aria-orientation', 'vertical')
	})

	it('renders with a custom data-slot', () => {
		// The anchor is renameable per §3.9, and ToolbarSeparator depends on it.
		const { container } = renderUI(<Divider data-slot="toolbar-separator" />)

		expect(bySlot(container, 'toolbar-separator')).toBeInTheDocument()

		expect(bySlot(container, 'divider')).toBeNull()
	})
})
