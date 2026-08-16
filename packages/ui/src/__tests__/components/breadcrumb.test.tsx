import { describe, expect, it, vi } from 'vitest'
import {
	Breadcrumb,
	BreadcrumbItem,
	BreadcrumbLink,
	BreadcrumbList,
	BreadcrumbSkeleton,
	BreadcrumbTrail,
} from '../../components/breadcrumb'
import { allBySlot, bySlot, fireEvent, renderUI, screen } from '../helpers'

describe('Breadcrumb', () => {
	it('pairs with an explicit BreadcrumbSkeleton in loading trees', () => {
		const { container } = renderUI(<BreadcrumbSkeleton items={3} />)

		expect(bySlot(container, 'breadcrumb')).not.toBeInTheDocument()

		// Three crumb lines and two separators between them.
		expect(allBySlot(container, 'placeholder')).toHaveLength(5)
	})

	it('renders with data-slot="breadcrumb"', () => {
		const { container } = renderUI(<Breadcrumb>content</Breadcrumb>)

		const el = bySlot(container, 'breadcrumb')

		expect(el).toBeInTheDocument()

		expect(el?.tagName).toBe('NAV')
	})
})

describe('BreadcrumbItem', () => {
	it('keeps aria-current on the crumb link and off the <li>', () => {
		// aria-current belongs on the crumb (BreadcrumbLink) only; both the
		// list item and the link carrying it would announce the state twice.
		const { container } = renderUI(
			<Breadcrumb>
				<BreadcrumbList>
					<BreadcrumbItem>
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
					<BreadcrumbItem>
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

describe('BreadcrumbTrail', () => {
	const STEPS = [{ label: 'Recipes', href: '/' }, { label: 'Roast chicken' }]

	/** The two-step trail every case but the last renders. */
	const renderTrail = () => renderUI(<BreadcrumbTrail steps={STEPS} />)

	it('renders one crumb per step, with a separator between them', () => {
		const { container } = renderTrail()

		expect(allBySlot(container, 'breadcrumb-item')).toHaveLength(2)

		// One fewer than the crumbs: a separator sits between, never before or
		// after.
		expect(allBySlot(container, 'breadcrumb-separator')).toHaveLength(1)
	})

	it('marks the last step as the current page and no other', () => {
		const { container } = renderTrail()

		const links = allBySlot(container, 'breadcrumb-link')

		expect(links[0]).not.toHaveAttribute('aria-current')

		expect(links[1]).toHaveAttribute('aria-current', 'page')
	})

	// The label is what the crumb announces and the mark is what it draws, so both
	// are laid out in every state and one of them is closed to nothing. A collapsed
	// crumb still says where it goes.
	it('lays out both the label and the mark for every crumb', () => {
		const { container } = renderTrail()

		expect(container.querySelectorAll('[data-trail-label]')).toHaveLength(2)

		expect(container.querySelectorAll('[data-trail-mark]')).toHaveLength(2)
	})

	it('hides the mark from assistive tech', () => {
		const { container } = renderTrail()

		for (const mark of container.querySelectorAll('[data-trail-mark]')) {
			expect(mark).toHaveAttribute('aria-hidden', 'true')
		}
	})

	it('renders a step with a destination as an anchor', () => {
		const { container } = renderTrail()

		const [first] = allBySlot(container, 'breadcrumb-link')

		expect(first?.tagName).toBe('A')

		expect(first).toHaveAttribute('href', '/')
	})

	it('renders a step with neither destination nor handler as a span', () => {
		const { container } = renderTrail()

		expect(allBySlot(container, 'breadcrumb-link')[1]?.tagName).toBe('SPAN')
	})

	// A step that drives state borrows the anchor for the click but carries no
	// destination, so the anchor's own default must not fire.
	it('calls onPick and refuses the anchor default for a step with no destination', () => {
		const onPick = vi.fn()

		const { container } = renderUI(
			<BreadcrumbTrail steps={[{ label: 'World', onPick }, { label: 'Oregon' }]} />,
		)

		const [first] = allBySlot(container, 'breadcrumb-link')

		expect(first).toHaveAttribute('href', '#')

		const event = new MouseEvent('click', { bubbles: true, cancelable: true })

		first?.dispatchEvent(event)

		expect(onPick).toHaveBeenCalledOnce()

		expect(event.defaultPrevented).toBe(true)
	})

	it('renders a single step with no separator', () => {
		const { container } = renderUI(<BreadcrumbTrail steps={[{ label: 'Recipes' }]} />)

		expect(allBySlot(container, 'breadcrumb-item')).toHaveLength(1)

		expect(allBySlot(container, 'breadcrumb-separator')).toHaveLength(0)
	})
})
