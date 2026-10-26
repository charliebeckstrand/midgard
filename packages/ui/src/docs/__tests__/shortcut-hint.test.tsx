import { act, screen } from '@testing-library/react'
import { describe, expect, it, vi } from 'vitest'
import { attach } from '../../__tests__/helpers/attach.ts'
import { hydrate, serverMarkup } from '../../__tests__/helpers/hydrate.tsx'
import { renderUI } from '../../__tests__/helpers/render-ui.tsx'
import { ShortcutHint } from '../kit/shortcut-hint.tsx'
import KeyboardShortcut from '../pages/components/command-palette/keyboard-shortcut.tsx'

// The key of an example is in the HTML of the build, so it is in the first
// paint. The build cannot know the platform, so it writes ⌘, and the client
// corrects it after the hydration.

const hint = (
	<kbd>
		<ShortcutHint keyName="J" />
	</kbd>
)

/** Hydrates the HTML of the build on a platform, and gives the key after the hydration. */
function hydrateOn(platform: string): { before: string; after: string } {
	vi.spyOn(navigator, 'platform', 'get').mockReturnValue(platform)

	const container = attach(serverMarkup(hint))

	const before = container.textContent ?? ''

	const { onRecoverableError } = hydrate(container, hint)

	expect(onRecoverableError).not.toHaveBeenCalled()

	return { before, after: container.textContent ?? '' }
}

describe('ShortcutHint', () => {
	it('is in the HTML of the build, and stays on Apple platforms', () => {
		expect(hydrateOn('MacIntel')).toEqual({ before: '⌘J', after: '⌘J' })
	})

	it('changes to Ctrl+ after the hydration on other platforms', () => {
		expect(hydrateOn('Win32')).toEqual({ before: '⌘J', after: 'Ctrl+J' })
	})
})

describe('the Keyboard shortcut example of the command palette', () => {
	// tinykeys resolves `$mod` to ctrlKey on non-Apple platforms; jsdom is non-Apple.
	function press(key: string) {
		act(() => {
			window.dispatchEvent(
				new KeyboardEvent('keydown', {
					key: key.toLowerCase(),
					code: `Key${key}`,
					ctrlKey: true,
					bubbles: true,
					cancelable: true,
				}),
			)
		})
	}

	it('leaves the key of the site search alone', () => {
		renderUI(<KeyboardShortcut />)

		press('K')

		expect(screen.queryByRole('dialog')).toBeNull()
	})

	it('opens from the key that its button shows', () => {
		renderUI(<KeyboardShortcut />)

		expect(screen.getByRole('button', { name: /Search commands/ }).textContent).toContain('Ctrl+J')

		press('J')

		expect(screen.queryByRole('dialog')).not.toBeNull()
	})
})
