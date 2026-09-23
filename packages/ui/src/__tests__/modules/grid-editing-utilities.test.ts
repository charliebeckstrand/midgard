// @vitest-environment node
import { describe, expect, it } from 'vitest'
import {
	type GridKeyPress,
	readKeyPress,
	seedFromKey,
	stepEditableColumn,
} from '../../modules/grid/engine/grid-editing-utilities'

/** A plain key press, with no modifier and no input method. */
const press = (key: string, extra: Partial<GridKeyPress> = {}): GridKeyPress => ({
	key,
	ctrlKey: false,
	metaKey: false,
	altKey: false,
	composing: false,
	altGraph: false,
	...extra,
})

describe('stepEditableColumn', () => {
	const columns = [{ field: 'name' }, { field: 'id', readOnly: true }, { editCell: () => null }, {}]

	it('steps to the next editable column, skipping a read-only and a display-only one', () => {
		expect(stepEditableColumn(columns, 0, 1)).toBe(2)

		expect(stepEditableColumn(columns, 2, -1)).toBe(0)
	})

	it('wraps at both edges of the row', () => {
		expect(stepEditableColumn(columns, 2, 1)).toBe(0)

		expect(stepEditableColumn(columns, 0, -1)).toBe(2)
	})

	it('returns the start when no other column is editable, and -1 when none is', () => {
		expect(stepEditableColumn([{ field: 'a' }, {}], 0, 1)).toBe(0)

		expect(stepEditableColumn([{}, { readOnly: true, field: 'b' }], 0, 1)).toBe(-1)
	})
})

describe('seedFromKey', () => {
	it('seeds a text editor with the character', () => {
		expect(seedFromKey(press('x'), 'text')).toBe('x')

		expect(seedFromKey(press('é'), 'text')).toBe('é')
	})

	it('seeds a number editor with a digit only', () => {
		expect(seedFromKey(press('7'), 'number')).toBe(7)

		expect(seedFromKey(press('-'), 'number')).toBeNull()

		expect(seedFromKey(press('x'), 'number')).toBeNull()
	})

	it('seeds a yes/no editor with nothing', () => {
		expect(seedFromKey(press('y'), 'boolean')).toBeNull()
	})

	it('refuses a shortcut, a named key, Space, and a composing press', () => {
		expect(seedFromKey(press('c', { ctrlKey: true }), 'text')).toBeNull()

		expect(seedFromKey(press('c', { metaKey: true }), 'text')).toBeNull()

		expect(seedFromKey(press('c', { altKey: true }), 'text')).toBeNull()

		expect(seedFromKey(press('F2'), 'text')).toBeNull()

		expect(seedFromKey(press('Dead'), 'text')).toBeNull()

		expect(seedFromKey(press(' '), 'text')).toBeNull()

		expect(seedFromKey(press('a', { composing: true }), 'text')).toBeNull()
	})

	it('seeds a character that AltGr makes, which reports Ctrl and Alt too', () => {
		expect(seedFromKey(press('@', { ctrlKey: true, altKey: true, altGraph: true }), 'text')).toBe(
			'@',
		)
	})
})

describe('readKeyPress', () => {
	const event = (extra: { keyCode?: number; isComposing?: boolean }) => ({
		key: 'a',
		ctrlKey: false,
		metaKey: false,
		altKey: false,
		keyCode: extra.keyCode ?? 65,
		nativeEvent: { isComposing: extra.isComposing ?? false },
		getModifierState: () => false,
	})

	it('reads the key that starts a composition as composing', () => {
		expect(readKeyPress(event({ keyCode: 229 })).composing).toBe(true)

		expect(readKeyPress(event({ isComposing: true })).composing).toBe(true)

		expect(readKeyPress(event({})).composing).toBe(false)
	})
})
