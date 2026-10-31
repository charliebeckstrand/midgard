import { createRef } from 'react'
import { describe, expect, it, vi } from 'vitest'
import { DashboardLayout } from '../../layouts/dashboard'
import { LocaleProvider } from '../../providers/locale'
import { adaptive } from '../../types/responsive'
import { bySlot, fireEvent, renderUI, screen } from '../helpers'

describe('DashboardLayout', () => {
	it('lays the filters beside the column from the breakpoint that `layout` names', () => {
		const { container } = renderUI(
			<DashboardLayout
				filters={<div>filter content</div>}
				layout={adaptive({ compact: 'drawer', medium: 'inline' })}
			>
				content
			</DashboardLayout>,
		)

		const rail = screen.getByText('filter content').parentElement

		expect(rail).toHaveClass('hidden', 'sm:flex')

		expect(container.querySelector('[data-slot="filters"]')?.parentElement).toHaveClass(
			'flex-col',
			'sm:flex-row',
		)
	})

	it('renders its own anchor and takes the attributes and ref of its <div>', () => {
		const ref = createRef<HTMLDivElement>()

		const { container } = renderUI(
			<DashboardLayout ref={ref} id="reports">
				content
			</DashboardLayout>,
		)

		const root = bySlot(container, 'dashboard-layout')

		expect(root).toBe(ref.current)

		expect(root?.id).toBe('reports')
	})

	it('does not render the filters trigger when filters are not provided', () => {
		renderUI(<DashboardLayout>content</DashboardLayout>)

		expect(screen.queryByRole('button', { name: 'Filters' })).not.toBeInTheDocument()
	})

	it('opens the mobile filters drawer when the trigger is clicked', () => {
		renderUI(<DashboardLayout filters={<div>filter content</div>}>content</DashboardLayout>)

		fireEvent.click(screen.getByRole('button', { name: 'Filters' }))

		expect(screen.getByText('Filters', { selector: 'h2,h3,[role="heading"]' })).toBeInTheDocument()
	})

	it('tells assistive technology that the filters button opens a dialog, and its state', () => {
		renderUI(<DashboardLayout filters={<div>filter content</div>}>content</DashboardLayout>)

		const trigger = screen.getByRole('button', { name: 'Filters' })

		expect(trigger).toHaveAttribute('aria-haspopup', 'dialog')

		expect(trigger).toHaveAttribute('aria-expanded', 'false')

		fireEvent.click(trigger)

		expect(trigger).toHaveAttribute('aria-expanded', 'true')
	})

	it('reports the mobile filter drawer opening', () => {
		const onOpenChange = vi.fn()

		renderUI(
			<DashboardLayout filters={<div>filter content</div>} onOpenChange={onOpenChange}>
				content
			</DashboardLayout>,
		)

		expect(onOpenChange).not.toHaveBeenCalled()

		fireEvent.click(screen.getByRole('button', { name: 'Filters' }))

		expect(onOpenChange).toHaveBeenCalledExactlyOnceWith(true)
	})
})

describe('DashboardLayout in a locale', () => {
	it('names the filters, their button, and their drawer in the language of the locale', () => {
		renderUI(
			<LocaleProvider locale="es-ES">
				<DashboardLayout filters={<div>filter content</div>}>content</DashboardLayout>
			</LocaleProvider>,
		)

		expect(screen.getByRole('complementary', { name: 'Filtros' })).toBeInTheDocument()

		fireEvent.click(screen.getByRole('button', { name: 'Filtros' }))

		expect(screen.getByRole('dialog', { name: 'Filtros' })).toBeInTheDocument()
	})
})
