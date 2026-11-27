import { fireEvent, render, screen } from '@testing-library/react'
import type { ComponentType } from 'react'
import { describe, expect, it } from 'vitest'
import { setupUser } from '../../__tests__/helpers/setup-user.ts'
import Glass from '../pages/components/context-menu/glass.tsx'
import ContextMenuPlayground from '../pages/components/context-menu/playground.tsx'
import Submenus from '../pages/components/context-menu/submenus.tsx'
import WithActions from '../pages/components/context-menu/with-actions.tsx'

// A keyboard opens a context menu from a focused element in its content (WCAG
// 2.1.1). The content of each example is a box with no control, so the box is
// the Tab stop.

/** The playground with its own props, as the page renders it before a change. */
function Playground() {
	return <ContextMenuPlayground>{null}</ContextMenuPlayground>
}

const examples: [string, ComponentType, string][] = [
	['playground', Playground, 'Image actions'],
	['with actions', WithActions, 'File actions'],
	['submenus', Submenus, 'Column actions'],
	['glass', Glass, 'Image actions'],
]

/**
 * Presses Shift+F10 on the element that has the focus. The browser fires the
 * `contextmenu` event at that element after the key, and jsdom does not.
 */
async function pressShiftF10(user: ReturnType<typeof setupUser>) {
	await user.keyboard('{Shift>}{F10}{/Shift}')

	fireEvent.contextMenu(document.activeElement ?? document.body)
}

describe('ContextMenu examples from the keyboard', () => {
	it.each(examples)('the %s example opens its menu from a Tab stop', async (_, Example, name) => {
		const user = setupUser()

		const { container } = render(<Example />)

		await user.tab()

		expect(container).toContainElement(document.activeElement as HTMLElement)

		expect(document.activeElement).toHaveAccessibleName()

		await pressShiftF10(user)

		const menu = screen.getByRole('menu', { name })

		expect(menu).toContainElement(document.activeElement as HTMLElement)
	})

	it('runs an action of the with actions example from the keyboard', async () => {
		const user = setupUser()

		render(<WithActions />)

		await user.tab()

		await pressShiftF10(user)

		// A key open puts the focus on the first item, Rename.
		expect(screen.getByRole('menuitem', { name: 'Rename' })).toHaveFocus()

		await user.keyboard('{Enter}')

		expect(screen.getByText('Last action: Rename')).toBeInTheDocument()
	})
})
