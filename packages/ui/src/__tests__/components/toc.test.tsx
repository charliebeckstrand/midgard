import { describe, expect, it, vi } from 'vitest'
import { Toc, type TocItem } from '../../components/toc'
import { allBySlot, bySlot, renderUI, screen } from '../helpers'

const items: TocItem[] = [
	{ id: 'intro', label: 'Introduction', level: 2 },
	{ id: 'usage', label: 'Usage', level: 2 },
	{ id: 'props', label: 'Props', level: 3 },
	{ id: 'api', label: 'API reference', level: 2 },
]

describe('Toc', () => {
	it('renders a nav with data-slot="toc"', () => {
		const { container } = renderUI(<Toc items={items} />)

		const el = bySlot(container, 'toc')

		expect(el).toBeInTheDocument()

		expect(el?.tagName).toBe('NAV')
	})

	it('applies custom className', () => {
		const { container } = renderUI(<Toc items={items} className="custom" />)

		const el = bySlot(container, 'toc')

		expect(el?.className).toContain('custom')
	})

	it('sets an accessible label on the nav', () => {
		const { container } = renderUI(<Toc items={items} />)

		expect(bySlot(container, 'toc')).toHaveAttribute('aria-label', 'Table of contents')
	})

	it('allows overriding the accessible label', () => {
		const { container } = renderUI(<Toc items={items} label="On this page" />)

		expect(bySlot(container, 'toc')).toHaveAttribute('aria-label', 'On this page')
	})

	it('renders an item per heading', () => {
		const { container } = renderUI(<Toc items={items} />)

		expect(allBySlot(container, 'toc-item')).toHaveLength(items.length)
	})

	it('renders a link per heading with a hash href', () => {
		const { container } = renderUI(<Toc items={items} />)

		const links = allBySlot(container, 'toc-link')

		expect(links).toHaveLength(items.length)

		expect(links[0]).toHaveAttribute('href', '#intro')

		expect(links[2]).toHaveAttribute('href', '#props')
	})

	it('renders each heading label', () => {
		renderUI(<Toc items={items} />)

		for (const i of items) {
			expect(screen.getByText(i.label)).toBeInTheDocument()
		}
	})

	it('marks the active item with aria-current and data-current', () => {
		const { container } = renderUI(<Toc items={items} activeId="usage" />)

		const links = allBySlot(container, 'toc-link')

		expect(links[0]).not.toHaveAttribute('aria-current')
		expect(links[1]).toHaveAttribute('aria-current', 'location')
		expect(links[1]).toHaveAttribute('data-current', '')
	})

	it('indents items based on their heading level', () => {
		const { container } = renderUI(<Toc items={items} />)

		const links = allBySlot(container, 'toc-link')

		const depth0 = links[0]?.getAttribute('style') ?? ''
		const depth1 = links[2]?.getAttribute('style') ?? ''

		expect(depth0).toContain('padding-inline-start')
		expect(depth1).toContain('padding-inline-start')

		expect(depth1).not.toBe(depth0)
	})

	it('returns null when there are no headings', () => {
		const { container } = renderUI(<Toc items={[]} />)

		expect(bySlot(container, 'toc')).not.toBeInTheDocument()
	})

	it('scans the document for headings when no items are provided', () => {
		document.body.innerHTML = `
			<h2 id="alpha">Alpha</h2>
			<h3 id="alpha-one">Alpha One</h3>
			<h2 id="beta">Beta</h2>
		`

		const { container } = renderUI(<Toc />)

		const links = allBySlot(container, 'toc-link')

		expect(links).toHaveLength(3)

		expect(links[0]).toHaveAttribute('href', '#alpha')
		expect(links[1]).toHaveAttribute('href', '#alpha-one')
		expect(links[2]).toHaveAttribute('href', '#beta')

		document.body.innerHTML = ''
	})

	it('ignores headings without an id', () => {
		document.body.innerHTML = `
			<h2 id="one">One</h2>
			<h2>No Id</h2>
			<h2 id="two">Two</h2>
		`

		const { container } = renderUI(<Toc />)

		const links = allBySlot(container, 'toc-link')

		expect(links).toHaveLength(2)

		expect(links[0]).toHaveAttribute('href', '#one')
		expect(links[1]).toHaveAttribute('href', '#two')

		document.body.innerHTML = ''
	})

	it('respects the levels prop', () => {
		document.body.innerHTML = `
			<h2 id="a">A</h2>
			<h3 id="b">B</h3>
			<h4 id="c">C</h4>
		`

		const { container } = renderUI(<Toc levels={[2, 4]} />)

		const links = allBySlot(container, 'toc-link')

		expect(links).toHaveLength(2)

		expect(links[0]).toHaveAttribute('href', '#a')
		expect(links[1]).toHaveAttribute('href', '#c')

		document.body.innerHTML = ''
	})

	it('fires onActiveChange when scroll position changes', () => {
		const onActiveChange = vi.fn()

		document.body.innerHTML = `
			<h2 id="first">First</h2>
			<h2 id="second">Second</h2>
		`

		const first = document.getElementById('first')
		const second = document.getElementById('second')

		// Simulate both headings above the offset at mount.
		vi.spyOn(first as HTMLElement, 'getBoundingClientRect').mockReturnValue({
			top: -10,
		} as DOMRect)

		vi.spyOn(second as HTMLElement, 'getBoundingClientRect').mockReturnValue({
			top: -5,
		} as DOMRect)

		renderUI(<Toc onActiveChange={onActiveChange} />)

		expect(onActiveChange).toHaveBeenCalledWith('second')

		document.body.innerHTML = ''

		vi.restoreAllMocks()
	})

	it('prefers activeId prop over internal scroll-spy state', () => {
		document.body.innerHTML = `
			<h2 id="first">First</h2>
			<h2 id="second">Second</h2>
		`

		const { container } = renderUI(<Toc activeId="second" />)

		const links = allBySlot(container, 'toc-link')

		expect(links[0]).not.toHaveAttribute('data-current')
		expect(links[1]).toHaveAttribute('data-current', '')

		document.body.innerHTML = ''
	})

	it('passes through HTML attributes', () => {
		const { container } = renderUI(<Toc items={items} id="nav-toc" data-testid="toc" />)

		const el = bySlot(container, 'toc')

		expect(el).toHaveAttribute('id', 'nav-toc')

		expect(el).toHaveAttribute('data-testid', 'toc')
	})
})
