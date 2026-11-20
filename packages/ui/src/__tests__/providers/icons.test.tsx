import { describe, expect, it } from 'vitest'
import { BreadcrumbSeparator } from '../../components/breadcrumb'
import { Icon } from '../../components/icon'
import * as glyphs from '../../primitives/icons/icons'
import { UIProvider } from '../../providers/ui'
import { renderUI } from '../helpers'

/** A replacement icon from another library: an `<svg>` that forwards its props. */
function Replacement({ glyph, ...props }: { glyph: string; className?: string }) {
	return <svg data-replacement={glyph} {...props} />
}

describe('UIProvider icons', () => {
	it('gives each glyph its own Lucide name', () => {
		const exports = Object.entries(glyphs)

		// A read that found no glyph would pass the case below with an empty list.
		expect(exports.length).toBeGreaterThan(50)

		expect(exports.filter(([name, glyph]) => glyph.displayName !== name)).toEqual([])
	})

	it('draws the Lucide default with no provider', () => {
		const { container } = renderUI(<glyphs.X />)

		expect(container.querySelector('svg')).toHaveClass('lucide-x')
	})

	it('draws the registered icon in place of the default in a component', () => {
		const { container } = renderUI(
			<UIProvider
				icons={{ ChevronRight: <Replacement glyph="chevron" className="replacement-class" /> }}
			>
				<ol>
					<BreadcrumbSeparator />
				</ol>
			</UIProvider>,
		)

		const icon = container.querySelector('svg')

		expect(icon).toHaveAttribute('data-replacement', 'chevron')

		expect(icon).not.toHaveClass('lucide')

		// The props of `Icon` and of the call site reach the replacement, after
		// its own class.
		expect(icon).toHaveAttribute('data-slot', 'icon')

		expect(icon).toHaveAttribute('aria-hidden', 'true')

		expect(icon).toHaveClass('replacement-class', 'shrink-0', 'rtl:-scale-x-100')
	})

	it('merges the style of a pixel size over the style of the replacement', () => {
		const { container } = renderUI(
			<UIProvider icons={{ X: <svg style={{ color: 'red', width: 1 }} /> }}>
				<Icon icon={<glyphs.X />} size={20} />
			</UIProvider>,
		)

		expect(container.querySelector('svg')).toHaveStyle({
			color: 'rgb(255, 0, 0)',
			width: '20px',
			height: '20px',
		})
	})

	it('merges the icons of a nested provider over the outer icons', () => {
		const { container } = renderUI(
			<UIProvider
				icons={{ X: <Replacement glyph="outer-x" />, Check: <Replacement glyph="outer-check" /> }}
			>
				<span data-scope="outer">
					<glyphs.Check />
				</span>
				<UIProvider icons={{ Check: <Replacement glyph="inner-check" /> }}>
					<span data-scope="inner">
						<glyphs.X />
						<glyphs.Check />
					</span>
				</UIProvider>
			</UIProvider>,
		)

		const drawn = (scope: string) =>
			[...container.querySelectorAll(`[data-scope="${scope}"] svg`)].map((svg) =>
				svg.getAttribute('data-replacement'),
			)

		expect(drawn('outer')).toEqual(['outer-check'])

		expect(drawn('inner')).toEqual(['outer-x', 'inner-check'])
	})

	it('keeps the per-instance icon over the registered icon', () => {
		const { container } = renderUI(
			<UIProvider icons={{ ChevronRight: <Replacement glyph="chevron" /> }}>
				<ol>
					<BreadcrumbSeparator>/</BreadcrumbSeparator>
				</ol>
			</UIProvider>,
		)

		expect(container.querySelector('svg')).toBeNull()

		expect(container.querySelector('[data-slot="breadcrumb-separator"]')).toHaveTextContent('/')
	})
})
