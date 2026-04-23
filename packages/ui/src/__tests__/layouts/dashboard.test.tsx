import { describe, expect, it } from 'vitest'
import { DashboardLayout } from '../../layouts/dashboard'
import { renderUI, screen } from '../helpers'

describe('DashboardLayout', () => {
	it('renders children', () => {
		renderUI(<DashboardLayout>Hello</DashboardLayout>)

		expect(screen.getByText('Hello')).toBeInTheDocument()
	})

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
})
