import { describe, expect, it, vi } from 'vitest'
import { BadgeRemovable } from '../../components/badge/badge-removable'
import { fireEvent, renderUI, screen } from '../helpers'

describe('BadgeRemovable', () => {
	it.each(['Delete', 'Backspace'])('removes the chip on %s', (key) => {
		const onRemove = vi.fn()

		renderUI(<BadgeRemovable label="react" onRemove={onRemove} />)

		fireEvent.keyDown(screen.getByRole('button', { name: 'Remove react' }), { key })

		expect(onRemove).toHaveBeenCalledOnce()
	})

	// The disabled button can hold the focus, so a key can reach it.
	it.each(['Delete', 'Backspace'])('ignores %s while disabled', (key) => {
		const onRemove = vi.fn()

		renderUI(<BadgeRemovable label="react" onRemove={onRemove} disabled />)

		const button = screen.getByRole('button', { name: 'Remove react' })

		button.focus()

		fireEvent.keyDown(button, { key })

		expect(button).toHaveFocus()

		expect(onRemove).not.toHaveBeenCalled()
	})
})
