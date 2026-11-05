import { act, screen } from '@testing-library/react'
import { describe, expect, it } from 'vitest'
import { hydrateOnPlatform } from '../../__tests__/helpers/hydrate.tsx'
import { renderUI } from '../../__tests__/helpers/render-ui.tsx'
import { ShortcutHint } from '../kit/shortcut-hint.tsx'
import KeyboardShortcut from '../pages/components/command-palette/keyboard-shortcut.tsx'

// The key of an example is in the HTML of the build, so it is in the first
// paint. The build cannot know the platform, so it writes the two texts and
// shows ⌘. The client shows Ctrl+ after the hydration on other platforms. The
// markup keeps the two texts, so the key keeps its size (CONVENTIONS §3.13).

const hint = (
	<kbd>
		<ShortcutHint keyName="J" />
	</kbd>
)

/** The text that the key shows: jsdom has no style sheet, so it reads the `invisible` class. */
const shown = (container: Element) =>
	[...container.querySelectorAll('kbd span span')]
		.filter((text) => !text.classList.contains('invisible'))
		.map((text) => text.textContent)
		.join('')

describe('ShortcutHint', () => {
	it('is in the HTML of the build, and stays on Apple platforms', () => {
		expect(hydrateOnPlatform(hint, 'MacIntel', shown)).toEqual({ before: '⌘J', after: '⌘J' })
	})

	it('shows Ctrl+ after the hydration on other platforms', () => {
		expect(hydrateOnPlatform(hint, 'Win32', shown)).toEqual({ before: '⌘J', after: 'Ctrl+J' })
	})

	it.each(['MacIntel', 'Win32'])(
		'keeps the two texts in the markup through the hydration on %s',
		(platform) => {
			expect(hydrateOnPlatform(hint, platform)).toEqual({ before: '⌘JCtrl+J', after: '⌘JCtrl+J' })
		},
	)
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
