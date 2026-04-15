import { describe, expect, it } from 'vitest'
import {
	Breadcrumb,
	BreadcrumbItem,
	BreadcrumbLink,
	BreadcrumbList,
	BreadcrumbSeparator,
} from '../../components/breadcrumb'
import { bySlot, renderUI, screen } from '../helpers'

describe('Breadcrumb', () => {
	it('renders with data-slot="breadcrumb"', () => {
		const { container } = renderUI(<Breadcrumb>content</Breadcrumb>)

		const el = bySlot(container, 'breadcrumb')

		expect(el).toBeInTheDocument()

		expect(el?.tagName).toBe('NAV')
	})

	it('applies custom className', () => {
		const { container } = renderUI(<Breadcrumb className="custom">content</Breadcrumb>)

		const el = bySlot(container, 'breadcrumb')

		expect(el?.className).toContain('custom')
	})
})

describe('BreadcrumbList', () => {
	it('renders with data-slot="breadcrumb-list"', () => {
		const { container } = renderUI(
			<Breadcrumb>
				<BreadcrumbList>
					<BreadcrumbItem>Home</BreadcrumbItem>
				</BreadcrumbList>
			</Breadcrumb>,
		)

		expect(bySlot(container, 'breadcrumb-list')).toBeInTheDocument()
	})
})

describe('BreadcrumbItem', () => {
	it('renders with data-slot="breadcrumb-item"', () => {
		const { container } = renderUI(
			<Breadcrumb>
				<BreadcrumbList>
					<BreadcrumbItem>Home</BreadcrumbItem>
				</BreadcrumbList>
			</Breadcrumb>,
		)

		expect(bySlot(container, 'breadcrumb-item')).toBeInTheDocument()
	})

	it('renders children', () => {
		renderUI(
			<Breadcrumb>
				<BreadcrumbList>
					<BreadcrumbItem>Home</BreadcrumbItem>
				</BreadcrumbList>
			</Breadcrumb>,
		)

		expect(screen.getByText('Home')).toBeInTheDocument()
	})

	it('sets aria-current when current', () => {
		const { container } = renderUI(
			<Breadcrumb>
				<BreadcrumbList>
					<BreadcrumbItem current>Page</BreadcrumbItem>
				</BreadcrumbList>
			</Breadcrumb>,
		)

		const el = bySlot(container, 'breadcrumb-item')

		expect(el).toHaveAttribute('aria-current', 'page')
	})
})

describe('BreadcrumbLink', () => {
	it('renders as a link when href is provided', () => {
		const { container } = renderUI(
			<Breadcrumb>
				<BreadcrumbList>
					<BreadcrumbItem>
						<BreadcrumbLink href="/home">Home</BreadcrumbLink>
					</BreadcrumbItem>
				</BreadcrumbList>
			</Breadcrumb>,
		)

		const el = bySlot(container, 'breadcrumb-link')

		expect(el?.tagName).toBe('A')

		expect(el).toHaveAttribute('href', '/home')
	})
})

describe('BreadcrumbSeparator', () => {
	it('renders with data-slot="breadcrumb-separator"', () => {
		const { container } = renderUI(
			<Breadcrumb>
				<BreadcrumbList>
					<BreadcrumbSeparator />
				</BreadcrumbList>
			</Breadcrumb>,
		)

		expect(bySlot(container, 'breadcrumb-separator')).toBeInTheDocument()
	})
})
