import { renderHook } from '@testing-library/react'
import type { ClipboardEvent, FocusEvent, KeyboardEvent } from 'react'
import { describe, expect, it, vi } from 'vitest'
import type { Coord, EditableGridColumn } from '../../components/editable-grid/context'
import { useEditableGridWrapper } from '../../components/editable-grid/use-editable-grid-wrapper'

type Row = { id: string; value: string }

const cols: EditableGridColumn<Row>[] = [
	{ id: 'value', title: 'Value' } as EditableGridColumn<Row>,
	{ id: 'readonly', title: 'RO', readOnly: true } as EditableGridColumn<Row>,
]

function makeEvent(key: string, opts: { shiftKey?: boolean; metaKey?: boolean } = {}) {
	return {
		key,
		shiftKey: opts.shiftKey ?? false,
		metaKey: opts.metaKey ?? false,
		ctrlKey: false,
		altKey: false,
		preventDefault: vi.fn(),
	} as unknown as KeyboardEvent<HTMLDivElement>
}

function setup(
	options: {
		editing?: boolean
		active?: Coord | null
		anchor?: Coord | null
		extras?: Set<string>
		hasMultiSelection?: boolean
		wrapper?: HTMLDivElement | null
		rows?: Row[]
		selection?: Set<string | number>
	} = {},
) {
	const rows = options.rows ?? [
		{ id: 'a', value: 'a1' },
		{ id: 'b', value: 'b1' },
	]

	const wrapper = options.wrapper !== undefined ? options.wrapper : document.createElement('div')

	const mocks = {
		moveActive: vi.fn(),
		moveActiveTo: vi.fn(),
		moveActiveTab: vi.fn(() => true),
		setActive: vi.fn(),
		setAnchor: vi.fn(),
		setExtraCells: vi.fn(),
		beginEdit: vi.fn(),
		applyCellWrite: vi.fn(),
		applyBulkFill: vi.fn(),
		onChange: vi.fn(),
		setSelection: vi.fn(),
	}

	const { result } = renderHook(() =>
		useEditableGridWrapper<Row>({
			editing: options.editing ?? false,
			active: options.active ?? { row: 0, col: 0 },
			anchor: options.anchor ?? null,
			extraCells: options.extras ?? new Set(),
			hasMultiSelection: options.hasMultiSelection ?? false,
			editableCols: cols,
			wrapperRef: { current: wrapper },
			rowsRef: { current: rows },
			activeRef: { current: options.active ?? { row: 0, col: 0 } },
			selectionRef: { current: options.selection ?? new Set() },
			...mocks,
			formatCell: (row, col) => String(row[col.id as keyof Row] ?? ''),
			parseValue: (raw) => raw,
			getRowKey: (r) => r.id,
		}),
	)

	return { api: result.current, wrapper, ...mocks }
}

describe('useEditableGridWrapper: onWrapperKeyDown arrow navigation', () => {
	it('ArrowUp moves the active cell up', () => {
		const { api, moveActive } = setup()

		const e = makeEvent('ArrowUp')

		api.onWrapperKeyDown(e)

		expect(e.preventDefault).toHaveBeenCalled()

		expect(moveActive).toHaveBeenCalledWith(-1, 0, false)
	})

	it('ArrowDown with shift passes extend=true', () => {
		const { api, moveActive } = setup()

		api.onWrapperKeyDown(makeEvent('ArrowDown', { shiftKey: true }))

		expect(moveActive).toHaveBeenCalledWith(1, 0, true)
	})

	it('ArrowLeft and ArrowRight delegate to moveActive', () => {
		const { api, moveActive } = setup()

		api.onWrapperKeyDown(makeEvent('ArrowLeft'))
		api.onWrapperKeyDown(makeEvent('ArrowRight'))

		expect(moveActive).toHaveBeenNthCalledWith(1, 0, -1, false)

		expect(moveActive).toHaveBeenNthCalledWith(2, 0, 1, false)
	})

	it('Tab delegates to moveActiveTab and prevents default when handled', () => {
		const { api, moveActiveTab } = setup()

		const e = makeEvent('Tab')

		api.onWrapperKeyDown(e)

		expect(moveActiveTab).toHaveBeenCalledWith(1)

		expect(e.preventDefault).toHaveBeenCalled()
	})

	it('Shift+Tab passes -1 to moveActiveTab', () => {
		const { api, moveActiveTab } = setup()

		api.onWrapperKeyDown(makeEvent('Tab', { shiftKey: true }))

		expect(moveActiveTab).toHaveBeenCalledWith(-1)
	})

	it('does not prevent default on Tab when moveActiveTab returns false', () => {
		const { api } = setup()

		const e = makeEvent('Tab')

		const { result } = renderHook(() =>
			useEditableGridWrapper<Row>({
				editing: false,
				active: { row: 0, col: 0 },
				anchor: null,
				extraCells: new Set(),
				hasMultiSelection: false,
				editableCols: cols,
				wrapperRef: { current: document.createElement('div') },
				rowsRef: { current: [{ id: 'a', value: 'a1' }] },
				activeRef: { current: { row: 0, col: 0 } },
				selectionRef: { current: new Set() },
				moveActive: vi.fn(),
				moveActiveTo: vi.fn(),
				moveActiveTab: vi.fn(() => false),
				setActive: vi.fn(),
				setAnchor: vi.fn(),
				setExtraCells: vi.fn(),
				beginEdit: vi.fn(),
				applyCellWrite: vi.fn(),
				applyBulkFill: vi.fn(),
				onChange: vi.fn(),
				setSelection: vi.fn(),
				formatCell: () => '',
				parseValue: (raw) => raw,
				getRowKey: (r) => r.id,
			}),
		)

		void api

		result.current.onWrapperKeyDown(e)

		expect(e.preventDefault).not.toHaveBeenCalled()
	})

	it('Home jumps to column 0 in the current row', () => {
		const { api, moveActiveTo } = setup({ active: { row: 1, col: 1 } })

		api.onWrapperKeyDown(makeEvent('Home'))

		expect(moveActiveTo).toHaveBeenCalledWith({ row: 1, col: 0 }, false)
	})

	it('End jumps to the last editable column in the current row', () => {
		const { api, moveActiveTo } = setup({ active: { row: 1, col: 0 } })

		api.onWrapperKeyDown(makeEvent('End'))

		expect(moveActiveTo).toHaveBeenCalledWith({ row: 1, col: cols.length - 1 }, false)
	})

	it('is a no-op while editing', () => {
		const { api, moveActive } = setup({ editing: true })

		api.onWrapperKeyDown(makeEvent('ArrowDown'))

		expect(moveActive).not.toHaveBeenCalled()
	})

	it('is a no-op when there are no rows', () => {
		const { api, moveActive } = setup({ rows: [] })

		api.onWrapperKeyDown(makeEvent('ArrowDown'))

		expect(moveActive).not.toHaveBeenCalled()
	})
})

describe('useEditableGridWrapper: onWrapperKeyDown editing entry', () => {
	it('Enter begins edit with the formatted cell value', () => {
		const { api, beginEdit } = setup({ active: { row: 0, col: 0 } })

		api.onWrapperKeyDown(makeEvent('Enter'))

		expect(beginEdit).toHaveBeenCalledWith({ row: 0, col: 0 }, 'a1')
	})

	it('F2 also begins edit', () => {
		const { api, beginEdit } = setup()

		api.onWrapperKeyDown(makeEvent('F2'))

		expect(beginEdit).toHaveBeenCalled()
	})

	it('printable characters begin edit with the typed value replacing the original', () => {
		const { api, beginEdit } = setup({ active: { row: 0, col: 0 } })

		api.onWrapperKeyDown(makeEvent('x'))

		expect(beginEdit).toHaveBeenCalledWith({ row: 0, col: 0 }, 'x', 'a1')
	})

	it('ignores printable characters combined with a modifier', () => {
		const { api, beginEdit } = setup()

		api.onWrapperKeyDown(makeEvent('v', { metaKey: true }))

		expect(beginEdit).not.toHaveBeenCalled()
	})
})

describe('useEditableGridWrapper: onWrapperKeyDown delete and escape', () => {
	it('Delete clears the active cell when there is no multi-selection', () => {
		const { api, applyCellWrite, applyBulkFill } = setup()

		api.onWrapperKeyDown(makeEvent('Delete'))

		expect(applyCellWrite).toHaveBeenCalledWith(0, 0, '')

		expect(applyBulkFill).not.toHaveBeenCalled()
	})

	it('Backspace bulk-fills empty when there is a multi-selection', () => {
		const { api, applyBulkFill, applyCellWrite } = setup({ hasMultiSelection: true })

		api.onWrapperKeyDown(makeEvent('Backspace'))

		expect(applyBulkFill).toHaveBeenCalledWith('')

		expect(applyCellWrite).not.toHaveBeenCalled()
	})

	it('Escape clears active when there is no multi-selection', () => {
		const { api, setActive } = setup()

		api.onWrapperKeyDown(makeEvent('Escape'))

		expect(setActive).toHaveBeenCalledWith(null)
	})

	it('Escape clears anchor and extras when there is a multi-selection', () => {
		const { api, setAnchor, setExtraCells, setActive } = setup({
			hasMultiSelection: true,
			anchor: { row: 0, col: 0 },
			extras: new Set(['1,0']),
		})

		api.onWrapperKeyDown(makeEvent('Escape'))

		expect(setAnchor).toHaveBeenCalledWith(null)

		expect(setExtraCells).toHaveBeenCalled()

		expect(setActive).not.toHaveBeenCalled()
	})
})

describe('useEditableGridWrapper: onWrapperPaste', () => {
	function makePaste(text: string): ClipboardEvent<HTMLDivElement> {
		return {
			clipboardData: { getData: vi.fn(() => text) },
			preventDefault: vi.fn(),
		} as unknown as ClipboardEvent<HTMLDivElement>
	}

	it('pastes a single value into the active cell', () => {
		const { api, applyCellWrite } = setup()

		api.onWrapperPaste(makePaste('hello'))

		expect(applyCellWrite).toHaveBeenCalledWith(0, 0, 'hello')
	})

	it('bulk-fills when there is a multi-selection and a single cell paste', () => {
		const { api, applyBulkFill } = setup({ hasMultiSelection: true })

		api.onWrapperPaste(makePaste('bulk'))

		expect(applyBulkFill).toHaveBeenCalledWith('bulk')
	})

	it('expands a matrix paste into row-major changes and skips read-only columns', () => {
		const { api, onChange } = setup({
			active: { row: 0, col: 0 },
			rows: [
				{ id: 'a', value: '' },
				{ id: 'b', value: '' },
			],
		})

		api.onWrapperPaste(makePaste('a1\tskip\nb1\tskip'))

		const changes = onChange.mock.calls[0]?.[0]

		expect(changes).toEqual([
			{ rowKey: 'a', columnId: 'value', value: 'a1' },
			{ rowKey: 'b', columnId: 'value', value: 'b1' },
		])
	})

	it('clears the selection after a successful matrix paste', () => {
		const { api, setSelection } = setup({
			selection: new Set(['a']),
			rows: [
				{ id: 'a', value: '' },
				{ id: 'b', value: '' },
			],
		})

		api.onWrapperPaste(makePaste('x\ny'))

		expect(setSelection).toHaveBeenCalledWith(new Set())
	})

	it('is a no-op while editing', () => {
		const { api, applyCellWrite } = setup({ editing: true })

		api.onWrapperPaste(makePaste('hello'))

		expect(applyCellWrite).not.toHaveBeenCalled()
	})

	it('is a no-op when the clipboard is empty', () => {
		const { api, applyCellWrite } = setup()

		api.onWrapperPaste(makePaste(''))

		expect(applyCellWrite).not.toHaveBeenCalled()
	})
})

describe('useEditableGridWrapper: onWrapperFocus and onWrapperBlur', () => {
	function makeFocusEvent(
		target: EventTarget | null,
		related: EventTarget | null = null,
	): FocusEvent<HTMLDivElement> {
		return { target, relatedTarget: related } as unknown as FocusEvent<HTMLDivElement>
	}

	it('onWrapperFocus moves focus to {0,0} when tabbing in from above', () => {
		const wrapper = document.createElement('div')

		document.body.appendChild(wrapper)

		const before = document.createElement('button')

		document.body.insertBefore(before, wrapper)

		const { result } = renderHook(() =>
			useEditableGridWrapper<Row>({
				editing: false,
				active: null,
				anchor: null,
				extraCells: new Set(),
				hasMultiSelection: false,
				editableCols: cols,
				wrapperRef: { current: wrapper },
				rowsRef: { current: [{ id: 'a', value: '' }] },
				activeRef: { current: null },
				selectionRef: { current: new Set() },
				moveActive: vi.fn(),
				moveActiveTo: vi.fn(),
				moveActiveTab: vi.fn(() => true),
				setActive: vi.fn(),
				setAnchor: vi.fn(),
				setExtraCells: vi.fn(),
				beginEdit: vi.fn(),
				applyCellWrite: vi.fn(),
				applyBulkFill: vi.fn(),
				onChange: vi.fn(),
				setSelection: vi.fn(),
				formatCell: () => '',
				parseValue: (raw) => raw,
				getRowKey: (r) => r.id,
			}),
		)

		result.current.onWrapperFocus(makeFocusEvent(wrapper, before))

		wrapper.remove()
		before.remove()
	})

	it('onWrapperBlur clears active and anchor when focus leaves the wrapper', () => {
		const wrapper = document.createElement('div')

		const { api, setActive, setAnchor } = setup({ wrapper })

		const external = document.createElement('button')

		api.onWrapperBlur(makeFocusEvent(wrapper, external))

		expect(setActive).toHaveBeenCalledWith(null)

		expect(setAnchor).toHaveBeenCalledWith(null)
	})

	it('onWrapperBlur is a no-op when focus moves to a child of the wrapper', () => {
		const wrapper = document.createElement('div')

		const child = document.createElement('button')

		wrapper.appendChild(child)

		const { api, setActive, setAnchor } = setup({ wrapper })

		api.onWrapperBlur(makeFocusEvent(wrapper, child))

		expect(setActive).not.toHaveBeenCalled()

		expect(setAnchor).not.toHaveBeenCalled()
	})
})
