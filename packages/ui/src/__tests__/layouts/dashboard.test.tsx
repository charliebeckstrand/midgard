import { describe, expect, it } from 'vitest'
import { DashboardLayout } from '../../layouts/dashboard'
import { fireEvent, renderUI, screen } from '../helpers'

describe('DashboardLayout', () => {
	it('does not render the filters trigger when filters are not provided', () => {
		renderUI(<DashboardLayout>content</DashboardLayout>)

		expect(screen.queryByRole('button', { name: 'Filters' })).not.toBeInTheDocument()
	})

	it('renders a filters trigger when filters are provided', () => {
		renderUI(<DashboardLayout filters={<div>filter content</div>}>content</DashboardLayout>)

		expect(screen.getByRole('button', { name: 'Filters' })).toBeInTheDocument()
	})

	it('renders the filters content', () => {
		renderUI(<DashboardLayout filters={<div>filter content</div>}>content</DashboardLayout>)

		expect(screen.getByText('filter content')).toBeInTheDocument()
	})

	it('opens the mobile filters drawer when the trigger is clicked', () => {
		renderUI(<DashboardLayout filters={<div>filter content</div>}>content</DashboardLayout>)

		fireEvent.click(screen.getByRole('button', { name: 'Filters' }))

		// The Drawer title renders once the offcanvas opens.
		expect(screen.getByText('Filters', { selector: 'h2,h3,[role="heading"]' })).toBeInTheDocument()
	})
})
