import type { KeyboardEvent as ReactKeyboardEvent } from 'react'
import { describe, expect, it, vi } from 'vitest'
import {
	interactionPlace,
	reseatFlagged,
	returnElement,
	returnFlagged,
} from '../../modules/grid/engine/grid-edit-focus'
import { claimedBySurface, editorMove, ownNode } from '../../modules/grid/engine/grid-edit-keys'
import { readLeave } from '../../modules/grid/engine/grid-edit-leave'
import { attach, present } from '../helpers'

/**
 * Mounts `html` in a new container on the page, and returns the container.
 * `attach` removes the container when the test finishes.
 */
function mount(html: string): HTMLElement {
	const host = attach(document.createElement('div'))

	host.innerHTML = html

	return host
}

/** The element of `host` that `selector` names. */
function at<E extends Element = HTMLElement>(host: ParentNode, selector: string): E {
	return present<E>(host.querySelector(selector), selector)
}

/** A key press on `target`, as the table's key handler reads it. */
function keyOn(
	table: HTMLTableElement,
	target: Element,
	key: string,
	extra: Partial<ReactKeyboardEvent<HTMLTableElement>> = {},
): ReactKeyboardEvent<HTMLTableElement> {
	return {
		key,
		target,
		currentTarget: table,
		shiftKey: false,
		ctrlKey: false,
		metaKey: false,
		altKey: false,
		defaultPrevented: false,
		...extra,
	} as ReactKeyboardEvent<HTMLTableElement>
}

const GRID = `
	<table role="grid" tabindex="0">
		<tbody>
			<tr data-row-index="0">
				<td data-grid-col="name"><input aria-label="name" /></td>
				<td data-grid-col="done"><button type="button">pencil</button></td>
			</tr>
		</tbody>
	</table>
	<button type="button" id="outside">outside</button>
`

describe('the focus rules of an edit session', () => {
	it('reads a press on cell content as its cell, the tab stop as the table, and an outside element as itself', () => {
		const host = mount(GRID)

		const table = at(host, 'table')

		expect(interactionPlace(table, at(host, 'button'))).toBe(at(host, 'td[data-grid-col="done"]'))

		expect(interactionPlace(table, table)).toBe(table)

		expect(interactionPlace(table, at(host, '#outside'))).toBe(at(host, '#outside'))
	})

	it('returns focus to the first tabbable content of a cell, else to the table, and to nothing once the element is gone', () => {
		const host = mount(GRID)

		const table = at(host, 'table')

		const cell = at(host, 'td[data-grid-col="done"]')

		expect(returnElement(cell, table)).toBe(at(host, 'button'))

		at(host, 'button').remove()

		expect(returnElement(cell, table)).toBe(table)

		cell.remove()

		expect(returnElement(cell, table)).toBeNull()
	})

	it('sets the flag only while the grid moves focus, and clears it when the move throws', () => {
		const host = mount(GRID)

		const table = at(host, 'table')

		const flag = { current: false }

		const seen: boolean[] = []

		table.addEventListener('focus', () => seen.push(flag.current))

		at(host, 'input').focus()

		reseatFlagged(flag, table)

		expect(document.activeElement).toBe(table)

		expect(seen).toEqual([true])

		expect(flag.current).toBe(false)

		const target = at(host, '#outside')

		vi.spyOn(target, 'focus').mockImplementation(() => {
			throw new Error('focus failed')
		})

		expect(() => returnFlagged(flag, target)).toThrow('focus failed')

		expect(flag.current).toBe(false)
	})

	it('leaves focus outside the grid where it is on a reseat', () => {
		const host = mount(GRID)

		const outside = at(host, '#outside')

		outside.focus()

		reseatFlagged({ current: false }, at(host, 'table'))

		expect(document.activeElement).toBe(outside)
	})
})

describe('the key rules of an edit session', () => {
	it('reads Enter, F2, and Tab from an editor as moves, and nothing from the tab stop or with a modifier', () => {
		const host = mount(GRID)

		const table = at<HTMLTableElement>(host, 'table')

		const input = at(host, 'input')

		expect(editorMove(keyOn(table, input, 'Enter'))).toBe('down')

		expect(editorMove(keyOn(table, input, 'F2'))).toBe('here')

		expect(editorMove(keyOn(table, input, 'Tab', { shiftKey: true }))).toBe('previous')

		expect(editorMove(keyOn(table, table, 'Enter'))).toBeNull()

		expect(editorMove(keyOn(table, input, 'Enter', { ctrlKey: true }))).toBeNull()

		expect(editorMove(keyOn(table, input, 'a'))).toBeNull()
	})

	it('leaves Enter to an element that acts on it natively', () => {
		const host = mount(GRID)

		const table = at<HTMLTableElement>(host, 'table')

		expect(editorMove(keyOn(table, at(host, 'button'), 'Enter'))).toBeNull()
	})

	it('gives a consumed press, and a press from an open surface, to that surface', () => {
		const host = mount(
			`${GRID}<div data-floating-ui-portal><button type="button">option</button></div>`,
		)

		const table = at<HTMLTableElement>(host, 'table')

		expect(claimedBySurface(keyOn(table, at(host, 'input'), 'Escape'))).toBe(false)

		expect(
			claimedBySurface(keyOn(table, at(host, 'input'), 'Escape', { defaultPrevented: true })),
		).toBe(true)

		expect(
			claimedBySurface(keyOn(table, at(host, '[data-floating-ui-portal] button'), 'Escape')),
		).toBe(true)
	})

	it('reads no row or cell of a grid nested in this one', () => {
		const host = mount(`
			<table id="outer"><tbody><tr><td>
				<table id="inner"><tbody><tr data-row-index="0"><td data-grid-col="a"></td></tr></tbody></table>
			</td></tr></tbody></table>
		`)

		const row = at(host, '#inner tr')

		expect(ownNode(row, at<HTMLTableElement>(host, '#outer'))).toBeNull()

		expect(ownNode(row, at<HTMLTableElement>(host, '#inner'))).toBe(row)
	})
})

describe('the leave rules of an edit session', () => {
	it('stays inside what the policy watches, leaves past it, and asks for an element outside the table', () => {
		const host = mount(GRID)

		const grid = at(host, 'table')

		const input = at(host, 'input')

		const pencil = at(host, 'button')

		const inEditors = (node: Element) => node === input

		expect(readLeave({ commitOn: 'leaveGrid', grid, from: input, next: pencil, inEditors })).toBe(
			'stay',
		)

		expect(readLeave({ commitOn: 'leaveEditor', grid, from: input, next: pencil, inEditors })).toBe(
			'leave',
		)

		expect(
			readLeave({
				commitOn: 'leaveGrid',
				grid,
				from: input,
				next: at(host, '#outside'),
				inEditors,
			}),
		).toBe('ask')

		expect(readLeave({ commitOn: 'leaveEditor', grid, from: pencil, next: null, inEditors })).toBe(
			'stay',
		)
	})

	it('reads a move to no element as a leave, and as a stay while the window has no focus', () => {
		const host = mount(GRID)

		const grid = at(host, 'table')

		const input = at(host, 'input')

		const args = {
			commitOn: 'leaveGrid' as const,
			grid,
			from: input,
			next: null,
			inEditors: () => true,
		}

		const hasFocus = vi.spyOn(document, 'hasFocus').mockReturnValue(true)

		expect(readLeave(args)).toBe('leave')

		hasFocus.mockReturnValue(false)

		expect(readLeave(args)).toBe('stay')
	})
})
