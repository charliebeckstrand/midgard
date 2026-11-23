import { useRef } from 'react'
import { describe, expect, it } from 'vitest'
import { userEvent } from 'vitest/browser'
import { ContextMenu } from '../../../components/context-menu'
import { fireEvent, renderUI, screen, waitFor } from '../../helpers'

/**
 * The focus after an action of a context menu that a key opened (real
 * floating engine).
 *
 * A keyboard open lends the menu the focused element, and the close gives the
 * focus back to it. An action that moves the focus, such as an Edit that loads
 * a composer, must keep that move. The jsdom suite mocks `@floating-ui/react`,
 * which gives no panel element, so the restore from the panel is here.
 */
function Surface() {
	const composer = useRef<HTMLTextAreaElement>(null)

	return (
		<>
			<ContextMenu
				items={[
					{ key: 'edit', label: 'Edit', onAction: () => composer.current?.focus() },
					{ key: 'copy', label: 'Copy', onAction: () => {} },
				]}
			>
				<button type="button">Message</button>
			</ContextMenu>
			<textarea ref={composer} aria-label="Composer" />
		</>
	)
}

/** Opens the menu from the focused message, as Shift+F10 does. */
async function openFromKey() {
	const message = screen.getByRole('button', { name: 'Message' })

	message.focus()

	fireEvent.keyDown(message, { key: 'F10', shiftKey: true })

	// A key open puts the menu at the middle of the focused element.
	const box = message.getBoundingClientRect()

	fireEvent.contextMenu(message, {
		clientX: box.left + box.width / 2,
		clientY: box.top + box.height / 2,
	})

	await waitFor(() => expect(screen.getByRole('menu')).toBeVisible())

	return message
}

describe('context menu action focus (real browser)', () => {
	it('keeps the focus where the action moved it', async () => {
		renderUI(<Surface />)

		await openFromKey()

		await userEvent.click(screen.getByRole('menuitem', { name: 'Edit' }))

		await waitFor(() => expect(screen.queryByRole('menu')).not.toBeInTheDocument())

		expect(screen.getByRole('textbox', { name: 'Composer' })).toHaveFocus()
	})

	it('gives the focus back to the opener after an action that does not move it', async () => {
		renderUI(<Surface />)

		const message = await openFromKey()

		await userEvent.click(screen.getByRole('menuitem', { name: 'Copy' }))

		await waitFor(() => expect(screen.queryByRole('menu')).not.toBeInTheDocument())

		expect(message).toHaveFocus()
	})
})
