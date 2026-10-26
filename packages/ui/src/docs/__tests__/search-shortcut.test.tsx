import { describe, expect, it, vi } from 'vitest'
import { attach } from '../../__tests__/helpers/attach.ts'
import { hydrate, serverMarkup } from '../../__tests__/helpers/hydrate.tsx'
import { DocsSearch, SearchButton } from '../app/search.tsx'

// The key of the search button is in the HTML of the build, so it is in the
// first paint. The build cannot know the platform, so it writes ⌘K, and the
// client corrects it after the hydration.

const button = (
	<DocsSearch>
		<SearchButton />
	</DocsSearch>
)

/** Hydrates the HTML of the build on a platform, and gives the key after the hydration. */
function hydrateOn(platform: string): { before: string; after: string } {
	vi.spyOn(navigator, 'platform', 'get').mockReturnValue(platform)

	const container = attach(serverMarkup(button))

	const before = container.querySelector('kbd')?.textContent ?? ''

	const { onRecoverableError } = hydrate(container, button)

	expect(onRecoverableError).not.toHaveBeenCalled()

	return { before, after: container.querySelector('kbd')?.textContent ?? '' }
}

describe('the key of the docs search button', () => {
	it('is in the HTML of the build, and stays on Apple platforms', () => {
		expect(hydrateOn('MacIntel')).toEqual({ before: '⌘K', after: '⌘K' })
	})

	it('changes to Ctrl+K after the hydration on other platforms', () => {
		expect(hydrateOn('Win32')).toEqual({ before: '⌘K', after: 'Ctrl+K' })
	})
})
