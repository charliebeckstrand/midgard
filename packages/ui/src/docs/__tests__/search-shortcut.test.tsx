// @vitest-environment jsdom
// `hydrateOnPlatform` renders the button on the server and hydrates it in the window.

import { describe, expect, it } from 'vitest'
import { hydrateOnPlatform } from '../../__tests__/helpers/hydrate.tsx'
import { DocsSearch, SearchButton } from '../app/search.tsx'

// The key of the search button is in the HTML of the build, so it is in the
// first paint. The build cannot know the platform, so it writes ⌘K, and the
// client corrects it after the hydration.

const button = (
	<DocsSearch>
		<SearchButton />
	</DocsSearch>
)

/** The text of the key of the button. */
const readKey = (container: Element) => container.querySelector('kbd')?.textContent ?? ''

describe('the key of the docs search button', () => {
	it('is in the HTML of the build, and stays on Apple platforms', () => {
		expect(hydrateOnPlatform(button, 'MacIntel', readKey)).toEqual({ before: '⌘K', after: '⌘K' })
	})

	it('changes to Ctrl+K after the hydration on other platforms', () => {
		expect(hydrateOnPlatform(button, 'Win32', readKey)).toEqual({ before: '⌘K', after: 'Ctrl+K' })
	})
})
