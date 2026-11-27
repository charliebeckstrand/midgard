// @vitest-environment jsdom
// `hydrateOnPlatform` renders the button on the server and hydrates it in the window.

import { describe, expect, it } from 'vitest'
import { hydrateOnPlatform } from '../../__tests__/helpers/hydrate.tsx'
import { SearchButton, SearchIconButton } from '../search/ui/search-button.tsx'
import { DocsSearch } from '../search/ui/search-provider.tsx'

// The key of the search button is in the HTML of the build, so it is in the
// first paint. The build cannot know the platform, so it writes ⌘K and ⌃K and
// shows ⌘K. The client shows ⌃K after the hydration on other platforms.

const button = (
	<DocsSearch>
		<SearchButton />
	</DocsSearch>
)

/** The text that the key of the button shows: jsdom has no style sheet, so it reads the `invisible` class. */
const readKey = (container: Element) =>
	[...container.querySelectorAll('kbd span span')]
		.filter((text) => !text.classList.contains('invisible'))
		.map((text) => text.textContent)
		.join('')

describe('the key of the docs search button', () => {
	it('is in the HTML of the build, and stays on Apple platforms', () => {
		expect(hydrateOnPlatform(button, 'MacIntel', readKey)).toEqual({ before: '⌘K', after: '⌘K' })
	})

	it('shows ⌃K after the hydration on other platforms', () => {
		expect(hydrateOnPlatform(button, 'Win32', readKey)).toEqual({ before: '⌘K', after: '⌃K' })
	})
})

// The key is in `aria-keyshortcuts`, and the `Kbd` is hidden from the
// accessibility tree, so the name of the button is only its label.
const readKeys = (container: Element) => {
	const search = container.querySelector('button')

	return `${search?.getAttribute('aria-keyshortcuts')} ${search?.querySelector('kbd')?.getAttribute('aria-hidden')}`
}

describe('the shortcut of the docs search button for a screen reader', () => {
	it('is Meta+K on Apple platforms, with the key hidden', () => {
		expect(hydrateOnPlatform(button, 'MacIntel', readKeys)).toEqual({
			before: 'Meta+K true',
			after: 'Meta+K true',
		})
	})

	it('is Control+K after the hydration on other platforms', () => {
		expect(hydrateOnPlatform(button, 'Win32', readKeys)).toEqual({
			before: 'Meta+K true',
			after: 'Control+K true',
		})
	})
})

// The icon button of the search in the bar of a narrow screen has the name of
// the search and the same shortcut.
const iconButton = (
	<DocsSearch>
		<SearchIconButton />
	</DocsSearch>
)

const readIconButton = (container: Element) => {
	const search = container.querySelector('button')

	return `${search?.getAttribute('aria-label')} ${search?.getAttribute('aria-keyshortcuts')}`
}

describe('the docs search icon button', () => {
	it('is named Search, with the shortcut of the platform', () => {
		expect(hydrateOnPlatform(iconButton, 'Win32', readIconButton)).toEqual({
			before: 'Search Meta+K',
			after: 'Search Control+K',
		})
	})
})
