// @vitest-environment jsdom
// `hydrateOnPlatform` renders the button on the server and hydrates it in the window.

import { describe, expect, it } from 'vitest'
import { hydrateOnPlatform } from '../../__tests__/helpers/hydrate.tsx'
import { DocsSearch, SearchButton } from '../app/search.tsx'

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
