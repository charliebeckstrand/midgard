import { act, fireEvent, render, screen } from '@testing-library/react'
import { renderToString } from 'react-dom/server'
import { afterEach, describe, expect, it } from 'vitest'
import { UIProvider } from '../../providers/ui'
import { DocsSearch } from '../app/search.tsx'
import { sectionRootClasses, sectionRules } from '../app/section-marks.ts'
import { DocsSidebar } from '../app/sidebar.tsx'
import type { PageLink } from '../plugin/pages.ts'

// The title of each section of the docs sidebar opens and closes the section.
// Each section starts open. The state of each section persists in
// `localStorage` and in a cookie, and the docs server marks the root element
// for each closed section, so the first paint hides it. The section of the
// current page opens on a navigation.

const page = (category: string, name: string): PageLink => ({
	category,
	name,
	path: category === 'components' ? `/${name.toLowerCase()}` : `/${category}/${name.toLowerCase()}`,
	tabs: [],
})

const PAGES = [
	page('components', 'Badge'),
	page('components', 'Button'),
	page('modules', 'Grid'),
	page('structure', 'Stack'),
]

const sidebar = (pathname?: string) => (
	<UIProvider pathname={pathname}>
		<DocsSearch>
			<DocsSidebar pages={PAGES} />
		</DocsSearch>
	</UIProvider>
)

/** The title of the section with the label `name`. */
const title = (name: string) => screen.getByRole('button', { name })

/** Whether the section with the label `name` is open. */
const isOpen = (name: string) => title(name).getAttribute('aria-expanded') === 'true'

const rail = (container: HTMLElement) => container.querySelector('[data-slot="letter-rail"]')

afterEach(() => {
	localStorage.clear()
})

describe('DocsSidebar sections', () => {
	it('opens each section at the start', () => {
		render(sidebar('/button'))

		expect(['Components', 'Modules', 'Structure'].map(isOpen)).toEqual([true, true, true])
	})

	it('closes and opens a section with its title, and stores the state', () => {
		const { container } = render(sidebar('/button'))

		fireEvent.click(title('Modules'))

		expect(isOpen('Modules')).toBe(false)

		expect(localStorage.getItem('docs-section-modules')).toBe('closed')

		expect(document.cookie).toContain('docs-section-modules=closed')

		expect(
			container.querySelector('[data-docs-section="modules"] [data-slot="collapse-panel"]'),
		).not.toHaveAttribute('data-open')

		fireEvent.click(title('Modules'))

		expect(isOpen('Modules')).toBe(true)

		expect(localStorage.getItem('docs-section-modules')).toBe('open')
	})

	it('keeps a closed section closed after a remount', () => {
		const first = render(sidebar('/button'))

		fireEvent.click(title('Structure'))

		first.unmount()

		render(sidebar('/button'))

		expect(isOpen('Structure')).toBe(false)

		expect(isOpen('Modules')).toBe(true)
	})

	it('opens the section of the current page, and stores it as open', () => {
		localStorage.setItem('docs-section-components', 'closed')

		render(sidebar('/button'))

		expect(isOpen('Components')).toBe(true)

		expect(localStorage.getItem('docs-section-components')).toBe('open')
	})

	it('opens a closed section on a navigation to a page in it', () => {
		const { rerender } = render(sidebar('/modules/grid'))

		fireEvent.click(title('Components'))

		expect(isOpen('Components')).toBe(false)

		rerender(sidebar('/badge'))

		expect(isOpen('Components')).toBe(true)
	})

	it('lets the reader close the section of the current page until the next navigation', () => {
		const { rerender } = render(sidebar('/button'))

		fireEvent.click(title('Components'))

		expect(isOpen('Components')).toBe(false)

		rerender(sidebar('/button'))

		expect(isOpen('Components')).toBe(false)

		rerender(sidebar('/badge'))

		expect(isOpen('Components')).toBe(true)
	})

	it('opens the released section on a navigation back to its page', () => {
		const { rerender } = render(sidebar('/button'))

		fireEvent.click(title('Components'))

		rerender(sidebar('/modules/grid'))

		expect(isOpen('Components')).toBe(false)

		rerender(sidebar('/button'))

		expect(isOpen('Components')).toBe(true)
	})

	it('hides the letter rail while the components are closed', () => {
		const { container } = render(sidebar('/modules/grid'))

		expect(rail(container)).not.toBeNull()

		fireEvent.click(title('Components'))

		expect(rail(container)).toBeNull()

		fireEvent.click(title('Components'))

		expect(rail(container)).not.toBeNull()
	})

	it('applies a change in another tab', () => {
		render(sidebar('/button'))

		act(() => {
			localStorage.setItem('docs-section-modules', 'closed')

			window.dispatchEvent(new StorageEvent('storage', { key: 'docs-section-modules' }))
		})

		expect(isOpen('Modules')).toBe(false)
	})

	it('renders each section open in the server markup, with the stored state', () => {
		localStorage.setItem('docs-section-modules', 'closed')

		const markup = document.createElement('div')

		markup.innerHTML = renderToString(sidebar('/button'))

		const expanded = [...markup.querySelectorAll('[data-slot="collapse-trigger"]')].map((trigger) =>
			trigger.getAttribute('aria-expanded'),
		)

		expect(expanded).toEqual(['true', 'true', 'true'])

		expect(markup.querySelector('[data-docs-section="components"]')).toHaveAttribute(
			'data-docs-current',
		)

		expect(markup.querySelector('style')?.textContent).toBe(
			sectionRules(['components', 'modules', 'structure']),
		)
	})
})

describe('sectionRootClasses', () => {
	it('gives a class for each closed section in the cookies', () => {
		expect(
			sectionRootClasses(
				'theme=dark; docs-section-modules=closed; docs-section-structure=open; docs-section-primitives=closed',
			),
		).toEqual(['docs-section-closed-modules', 'docs-section-closed-primitives'])
	})

	it('gives no class for a cookie name that is not a section folder', () => {
		expect(sectionRootClasses('docs-section-Bad"x=closed; docs-section-=closed')).toEqual([])
	})

	it('gives no class with no cookies', () => {
		expect(sectionRootClasses()).toEqual([])
	})
})
