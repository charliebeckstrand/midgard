import { describe, expect, it, vi } from 'vitest'
import {
	Breadcrumb,
	BreadcrumbItem,
	BreadcrumbLink,
	BreadcrumbList,
} from '../../components/breadcrumb'
import { bySlot, fireEvent, renderUI, screen } from '../helpers'

describe('Breadcrumb', () => {
	it('renders with data-slot="breadcrumb"', () => {
		const { container } = renderUI(<Breadcrumb>content</Breadcrumb>)

		const el = bySlot(container, 'breadcrumb')

		expect(el).toBeInTheDocument()

		expect(el?.tagName).toBe('NAV')
	})
})

describe('BreadcrumbItem', () => {
	it('styles the current item without duplicating aria-current on the <li>', () => {
		// aria-current belongs on the crumb (BreadcrumbLink) only; both the
		// list item and the link carrying it would announce the state twice.
		const { container } = renderUI(
			<Breadcrumb>
				<BreadcrumbList>
					<BreadcrumbItem current>
						<BreadcrumbLink current>Page</BreadcrumbLink>
					</BreadcrumbItem>
				</BreadcrumbList>
			</Breadcrumb>,
		)

		expect(bySlot(container, 'breadcrumb-item')).not.toHaveAttribute('aria-current')

		expect(bySlot(container, 'breadcrumb-link')).toHaveAttribute('aria-current', 'page')
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

	it('marks a current crumb that is still a link with aria-current', () => {
		const { container } = renderUI(
			<Breadcrumb>
				<BreadcrumbList>
					<BreadcrumbItem current>
						<BreadcrumbLink href="/here" current>
							Here
						</BreadcrumbLink>
					</BreadcrumbItem>
				</BreadcrumbList>
			</Breadcrumb>,
		)

		const el = bySlot(container, 'breadcrumb-link')

		expect(el?.tagName).toBe('A')

		expect(el).toHaveAttribute('aria-current', 'page')
	})
})

describe('Breadcrumb keyboard model', () => {
	it('forwards onKeyDown to the consumer', () => {
		const onKeyDown = vi.fn()

		renderUI(
			<Breadcrumb onKeyDown={onKeyDown}>
				<BreadcrumbList>
					<BreadcrumbItem>
						<BreadcrumbLink href="/a">A</BreadcrumbLink>
					</BreadcrumbItem>
				</BreadcrumbList>
			</Breadcrumb>,
		)

		const nav = screen.getByRole('navigation', { name: 'Breadcrumb' })

		fireEvent.keyDown(nav, { key: 'ArrowRight' })

		expect(onKeyDown).toHaveBeenCalledOnce()
	})

	it('keeps each crumb individually Tab-focusable and does not rove on arrows', () => {
		renderUI(
			<Breadcrumb>
				<BreadcrumbList>
					<BreadcrumbItem>
						<BreadcrumbLink href="/a">A</BreadcrumbLink>
					</BreadcrumbItem>
					<BreadcrumbItem>
						<BreadcrumbLink href="/b">B</BreadcrumbLink>
					</BreadcrumbItem>
				</BreadcrumbList>
			</Breadcrumb>,
		)

		const links = screen.getAllByRole('link')

		// Navigation links are ordinary Tab stops, not a roving widget.
		for (const link of links) expect(link.tabIndex).toBe(0)

		links[0]?.focus()

		fireEvent.keyDown(screen.getByRole('navigation', { name: 'Breadcrumb' }), { key: 'ArrowRight' })

		// Arrow keys must not hijack focus between crumbs.
		expect(document.activeElement).toBe(links[0])
	})
})

describe('BreadcrumbLink without href', () => {
	it('renders a span with aria-current when current is true', () => {
		const { container } = renderUI(
			<Breadcrumb>
				<BreadcrumbList>
					<BreadcrumbItem>
						<BreadcrumbLink current>Current</BreadcrumbLink>
					</BreadcrumbItem>
				</BreadcrumbList>
			</Breadcrumb>,
		)

		const el = bySlot(container, 'breadcrumb-link')

		expect(el?.tagName).toBe('SPAN')

		expect(el).toHaveAttribute('aria-current', 'page')
	})

	it('renders a span without aria-current when current is false', () => {
		const { container } = renderUI(
			<Breadcrumb>
				<BreadcrumbList>
					<BreadcrumbItem>
						<BreadcrumbLink>Plain</BreadcrumbLink>
					</BreadcrumbItem>
				</BreadcrumbList>
			</Breadcrumb>,
		)

		const el = bySlot(container, 'breadcrumb-link')

		expect(el?.tagName).toBe('SPAN')

		expect(el).not.toHaveAttribute('aria-current')
	})
})
