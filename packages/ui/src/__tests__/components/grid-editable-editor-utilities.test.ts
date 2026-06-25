import type { KeyboardEvent } from 'react'
import { describe, expect, it, vi } from 'vitest'
import { editorKeyHandler } from '../../modules/grid/grid-editable-editor-utilities'

type Handler = ReturnType<typeof editorKeyHandler>

function fire(handler: Handler, key: string, shiftKey = false) {
	const preventDefault = vi.fn()

	handler({ key, shiftKey, preventDefault } as unknown as KeyboardEvent<HTMLElement>)

	return preventDefault
}

describe('editorKeyHandler', () => {
	it('commits down and prevents default on Enter', () => {
		const commit = vi.fn(() => true)

		const cancel = vi.fn()

		const preventDefault = fire(editorKeyHandler(commit, cancel), 'Enter')

		expect(commit).toHaveBeenCalledWith('down')

		expect(preventDefault).toHaveBeenCalledTimes(1)

		expect(cancel).not.toHaveBeenCalled()
	})

	it('cancels and prevents default on Escape', () => {
		const commit = vi.fn(() => true)

		const cancel = vi.fn()

		const preventDefault = fire(editorKeyHandler(commit, cancel), 'Escape')

		expect(cancel).toHaveBeenCalledTimes(1)

		expect(preventDefault).toHaveBeenCalledTimes(1)

		expect(commit).not.toHaveBeenCalled()
	})

	it('commits right on Tab', () => {
		const commit = vi.fn(() => true)

		fire(editorKeyHandler(commit, vi.fn()), 'Tab')

		expect(commit).toHaveBeenCalledWith('right')
	})

	it('commits left on Shift+Tab', () => {
		const commit = vi.fn(() => true)

		fire(editorKeyHandler(commit, vi.fn()), 'Tab', true)

		expect(commit).toHaveBeenCalledWith('left')
	})

	it('swallows Tab only when the commit keeps the cursor in the grid', () => {
		const stays = fire(
			editorKeyHandler(
				vi.fn(() => true),
				vi.fn(),
			),
			'Tab',
		)

		expect(stays).toHaveBeenCalledTimes(1)

		const exits = fire(
			editorKeyHandler(
				vi.fn(() => false),
				vi.fn(),
			),
			'Tab',
		)

		expect(exits).not.toHaveBeenCalled()
	})

	it('ignores other keys', () => {
		const commit = vi.fn(() => true)

		const cancel = vi.fn()

		const preventDefault = fire(editorKeyHandler(commit, cancel), 'a')

		expect(commit).not.toHaveBeenCalled()

		expect(cancel).not.toHaveBeenCalled()

		expect(preventDefault).not.toHaveBeenCalled()
	})
})
