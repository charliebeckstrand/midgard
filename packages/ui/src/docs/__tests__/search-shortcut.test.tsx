import { act } from '@testing-library/react'
import { hydrateRoot } from 'react-dom/client'
import { renderToString } from 'react-dom/server'
import { describe, expect, it, onTestFinished, vi } from 'vitest'
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
async function hydrateOn(platform: string): Promise<{ before: string; after: string }> {
	vi.spyOn(navigator, 'platform', 'get').mockReturnValue(platform)

	const container = document.createElement('div')

	container.innerHTML = renderToString(button)

	document.body.append(container)

	const before = container.querySelector('kbd')?.textContent ?? ''

	const onRecoverableError = vi.fn()

	const root = await act(async () => hydrateRoot(container, button, { onRecoverableError }))

	onTestFinished(() => {
		act(() => root.unmount())

		container.remove()
	})

	expect(onRecoverableError).not.toHaveBeenCalled()

	return { before, after: container.querySelector('kbd')?.textContent ?? '' }
}

describe('the key of the docs search button', () => {
	it('is in the HTML of the build, and stays on Apple platforms', async () => {
		expect(await hydrateOn('MacIntel')).toEqual({ before: '⌘K', after: '⌘K' })
	})

	it('changes to Ctrl+K after the hydration on other platforms', async () => {
		expect(await hydrateOn('Win32')).toEqual({ before: '⌘K', after: 'Ctrl+K' })
	})
})
