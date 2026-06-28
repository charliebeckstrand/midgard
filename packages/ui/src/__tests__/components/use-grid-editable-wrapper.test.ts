import { renderHook } from '@testing-library/react'
import type { ClipboardEvent, FocusEvent, MouseEvent } from 'react'
import { afterEach, describe, expect, it, vi } from 'vitest'
import type {
	Coord,
	GridEditableColumn,
	GridEditableDraftApi,
	GridEditableMutationsApi,
	GridEditableNavigationApi,
} from '../../modules/grid/grid-editable-types'
import { useGridEditableWrapper } from '../../modules/grid/use-grid-editable-wrapper'
import { makeKeyEvent } from '../helpers'

afterEach(() => {
	document.body.innerHTML = ''
})

type Row = { id: string; value: string }

const cols: GridEditableColumn<Row>[] = [
	{ id: 'value', title: 'Value' } as GridEditableColumn<Row>,
	{ id: 'readonly', title: 'RO', readOnly: true } as GridEditableColumn<Row>,
]

function setup(
	options: {
		editing?: boolean
		active?: Coord | null
		anchor?: Coord | null
		extras?: Set<string>
		hasMultiSelection?: boolean
		wrapper?: HTMLTableElement | null
		rows?: Row[]
	} = {},
) {
	const rows = options.rows ?? [
		{ id: 'a', value: 'a1' },
		{ id: 'b', value: 'b1' },
	]

	const wrapper = options.wrapper !== undefined ? options.wrapper : document.createElement('table')

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
		onValueChange: vi.fn(),
	}

	// hasMultiSelection is derived inside the wrapper as `!!anchor || extras.size > 0`;
	// honor a test-supplied flag by defaulting anchor to a truthy value when set.
	const effectiveAnchor = options.anchor ?? (options.hasMultiSelection ? { row: 0, col: 1 } : null)

	// `options.active === undefined` means "use the default"; `null` means
	// "explicitly no active cell", which exercises the null-active branches.
	const activeValue = 'active' in options ? (options.active ?? null) : { row: 0, col: 0 }

	const partialNav: Partial<GridEditableNavigationApi> = {
		active: activeValue,
		anchor: effectiveAnchor,
		extraCells: options.extras ?? new Set(),
		activeRef: { current: activeValue },
		moveActive: mocks.moveActive,
		moveActiveTo: mocks.moveActiveTo,
		moveActiveTab: mocks.moveActiveTab,
		setActive: mocks.setActive,
		setAnchor: mocks.setAnchor,
		setExtraCells: mocks.setExtraCells,
	}

	const nav = partialNav as GridEditableNavigationApi

	const mutations: GridEditableMutationsApi = {
		applyCellWrite: mocks.applyCellWrite,
		applyBulkFill: mocks.applyBulkFill,
	}

	const partialDraft: Partial<GridEditableDraftApi> = {
		editing: options.editing ?? false,
		beginEdit: mocks.beginEdit,
	}

	const draft = partialDraft as GridEditableDraftApi

	const { result } = renderHook(() =>
		useGridEditableWrapper<Row>({
			nav,
			mutations,
			draft,
			rows: {
				rowsRef: { current: rows },
				editableCols: cols,
				getKey: (r) => r.id,
				formatCell: (row, col) => String(row[col.id as keyof Row] ?? ''),
				parseValue: (raw) => raw,
			},
			wrapperRef: { current: wrapper },
			onValueChange: mocks.onValueChange,
			undo: vi.fn(),
			redo: vi.fn(),
		}),
	)

	return { api: result.current, wrapper, ...mocks }
}

describe('useGridEditableWrapper: onWrapperKeyDown arrow navigation', () => {
	it('ArrowUp moves the active cell up', () => {
		const { api, moveActive } = setup()

		const e = makeKeyEvent<HTMLTableElement>('ArrowUp')

		api.onWrapperKeyDown(e)

		expect(e.preventDefault).toHaveBeenCalled()

		expect(moveActive).toHaveBeenCalledWith(-1, 0, false)
	})

	it('ArrowDown with shift passes extend=true', () => {
		const { api, moveActive } = setup()

		api.onWrapperKeyDown(makeKeyEvent<HTMLTableElement>('ArrowDown', { shiftKey: true }))

		expect(moveActive).toHaveBeenCalledWith(1, 0, true)
	})

	it('ArrowLeft and ArrowRight delegate to moveActive', () => {
		const { api, moveActive } = setup()

		api.onWrapperKeyDown(makeKeyEvent<HTMLTableElement>('ArrowLeft'))

		api.onWrapperKeyDown(makeKeyEvent<HTMLTableElement>('ArrowRight'))

		expect(moveActive).toHaveBeenNthCalledWith(1, 0, -1, false)

		expect(moveActive).toHaveBeenNthCalledWith(2, 0, 1, false)
	})

	it('Tab delegates to moveActiveTab and prevents default when handled', () => {
		const { api, moveActiveTab } = setup()

		const e = makeKeyEvent<HTMLTableElement>('Tab')

		api.onWrapperKeyDown(e)

		expect(moveActiveTab).toHaveBeenCalledWith(1)

		expect(e.preventDefault).toHaveBeenCalled()
	})

	it('Shift+Tab passes -1 to moveActiveTab', () => {
		const { api, moveActiveTab } = setup()

		api.onWrapperKeyDown(makeKeyEvent<HTMLTableElement>('Tab', { shiftKey: true }))

		expect(moveActiveTab).toHaveBeenCalledWith(-1)
	})

	it('does not prevent default on Tab when moveActiveTab returns false', () => {
		const { api } = setup()

		const e = makeKeyEvent<HTMLTableElement>('Tab')

		const partialNav: Partial<GridEditableNavigationApi> = {
			active: { row: 0, col: 0 },
			anchor: null,
			extraCells: new Set(),
			activeRef: { current: { row: 0, col: 0 } },
			moveActive: vi.fn(),
			moveActiveTo: vi.fn(),
			moveActiveTab: vi.fn(() => false),
			setActive: vi.fn(),
			setAnchor: vi.fn(),
			setExtraCells: vi.fn(),
		}

		const partialDraft: Partial<GridEditableDraftApi> = {
			editing: false,
			beginEdit: vi.fn(),
		}

		const { result } = renderHook(() =>
			useGridEditableWrapper<Row>({
				nav: partialNav as GridEditableNavigationApi,
				mutations: {
					applyCellWrite: vi.fn(),
					applyBulkFill: vi.fn(),
				},
				draft: partialDraft as GridEditableDraftApi,
				rows: {
					rowsRef: { current: [{ id: 'a', value: 'a1' }] },
					editableCols: cols,
					getKey: (r) => r.id,
					formatCell: () => '',
					parseValue: (raw) => raw,
				},
				wrapperRef: { current: document.createElement('table') },
				onValueChange: vi.fn(),
				undo: vi.fn(),
				redo: vi.fn(),
			}),
		)

		void api

		result.current.onWrapperKeyDown(e)

		expect(e.preventDefault).not.toHaveBeenCalled()
	})

	// `activeRef.current` may be null before the first focus lands; the Home/End
	// handlers then default `prev` to { row: 0, col: 0 }.
	it.each<[string, Coord | null, string, Coord]>([
		['Home jumps to column 0 in the current row', { row: 1, col: 1 }, 'Home', { row: 1, col: 0 }],
		[
			'End jumps to the last editable column in the current row',
			{ row: 1, col: 0 },
			'End',
			{ row: 1, col: cols.length - 1 },
		],
		[
			'Home falls back to {row: 0, col: 0} when activeRef is empty',
			null,
			'Home',
			{ row: 0, col: 0 },
		],
		[
			'End falls back to {row: 0, col: lastEditable} when activeRef is empty',
			null,
			'End',
			{ row: 0, col: cols.length - 1 },
		],
	])('%s', (_name, active, key, expected) => {
		const { api, moveActiveTo } = setup({ active })

		api.onWrapperKeyDown(makeKeyEvent<HTMLTableElement>(key))

		expect(moveActiveTo).toHaveBeenCalledWith(expected, false)
	})

	it('is a no-op while editing', () => {
		const { api, moveActive } = setup({ editing: true })

		api.onWrapperKeyDown(makeKeyEvent<HTMLTableElement>('ArrowDown'))

		expect(moveActive).not.toHaveBeenCalled()
	})

	it('is a no-op when there are no rows', () => {
		const { api, moveActive } = setup({ rows: [] })

		api.onWrapperKeyDown(makeKeyEvent<HTMLTableElement>('ArrowDown'))

		expect(moveActive).not.toHaveBeenCalled()
	})
})

describe('useGridEditableWrapper: onWrapperKeyDown editing entry', () => {
	it.each<[string, string, unknown[]]>([
		['Enter begins edit with the formatted cell value', 'Enter', [{ row: 0, col: 0 }, 'a1']],
		[
			'Space begins edit with the formatted value rather than typing a space',
			' ',
			[{ row: 0, col: 0 }, 'a1'],
		],
		[
			'printable characters begin edit with the typed value replacing the original',
			'x',
			[{ row: 0, col: 0 }, 'x', 'a1'],
		],
	])('%s', (_name, key, expectedArgs) => {
		const { api, beginEdit } = setup({ active: { row: 0, col: 0 } })

		api.onWrapperKeyDown(makeKeyEvent<HTMLTableElement>(key))

		expect(beginEdit).toHaveBeenCalledWith(...expectedArgs)
	})

	it('F2 also begins edit', () => {
		const { api, beginEdit } = setup()

		api.onWrapperKeyDown(makeKeyEvent<HTMLTableElement>('F2'))

		expect(beginEdit).toHaveBeenCalled()
	})

	it('ignores printable characters combined with a modifier', () => {
		const { api, beginEdit } = setup()

		api.onWrapperKeyDown(makeKeyEvent<HTMLTableElement>('v', { metaKey: true }))

		expect(beginEdit).not.toHaveBeenCalled()
	})
})

describe('useGridEditableWrapper: onWrapperKeyDown delete and escape', () => {
	it('Delete clears the active cell when there is no multi-selection', () => {
		const { api, applyCellWrite, applyBulkFill } = setup()

		api.onWrapperKeyDown(makeKeyEvent<HTMLTableElement>('Delete'))

		expect(applyCellWrite).toHaveBeenCalledWith(0, 0, '')

		expect(applyBulkFill).not.toHaveBeenCalled()
	})

	it('Backspace bulk-fills empty when there is a multi-selection', () => {
		const { api, applyBulkFill, applyCellWrite } = setup({ hasMultiSelection: true })

		api.onWrapperKeyDown(makeKeyEvent<HTMLTableElement>('Backspace'))

		expect(applyBulkFill).toHaveBeenCalledWith('')

		expect(applyCellWrite).not.toHaveBeenCalled()
	})

	it('Escape clears active when there is no multi-selection', () => {
		const { api, setActive } = setup()

		api.onWrapperKeyDown(makeKeyEvent<HTMLTableElement>('Escape'))

		expect(setActive).toHaveBeenCalledWith(null)
	})

	it('Escape clears anchor and extras when there is a multi-selection', () => {
		const { api, setAnchor, setExtraCells, setActive } = setup({
			hasMultiSelection: true,
			anchor: { row: 0, col: 0 },
			extras: new Set(['1,0']),
		})

		api.onWrapperKeyDown(makeKeyEvent<HTMLTableElement>('Escape'))

		expect(setAnchor).toHaveBeenCalledWith(null)

		expect(setExtraCells).toHaveBeenCalled()

		expect(setActive).not.toHaveBeenCalled()
	})

	it('Escape with only anchor leaves extras alone', () => {
		const { api, setAnchor, setExtraCells } = setup({
			anchor: { row: 0, col: 0 },
		})

		api.onWrapperKeyDown(makeKeyEvent<HTMLTableElement>('Escape'))

		expect(setAnchor).toHaveBeenCalledWith(null)

		expect(setExtraCells).not.toHaveBeenCalled()
	})

	it('Escape with only extras leaves anchor alone', () => {
		const { api, setAnchor, setExtraCells } = setup({
			extras: new Set(['1,0']),
		})

		api.onWrapperKeyDown(makeKeyEvent<HTMLTableElement>('Escape'))

		expect(setAnchor).not.toHaveBeenCalled()

		expect(setExtraCells).toHaveBeenCalled()
	})

	it('Delete is a no-op when no active cell', () => {
		const { api, applyCellWrite, applyBulkFill } = setup({ active: null })

		const event = makeKeyEvent<HTMLTableElement>('Delete')

		api.onWrapperKeyDown(event)

		expect(applyCellWrite).not.toHaveBeenCalled()

		expect(applyBulkFill).not.toHaveBeenCalled()

		expect(event.preventDefault).not.toHaveBeenCalled()
	})

	it('Escape is a no-op when no active cell', () => {
		const { api, setActive, setAnchor } = setup({ active: null })

		api.onWrapperKeyDown(makeKeyEvent<HTMLTableElement>('Escape'))

		expect(setActive).not.toHaveBeenCalled()

		expect(setAnchor).not.toHaveBeenCalled()
	})

	it.each<[string, Coord | null, string]>([
		['Enter is a no-op when no active cell', null, 'Enter'],
		[
			'Enter is a no-op when the active cell points past the row range',
			{ row: 99, col: 0 },
			'Enter',
		],
		[
			'printable characters are ignored when active points past the row range',
			{ row: 99, col: 0 },
			'x',
		],
	])('%s', (_name, active, key) => {
		const { api, beginEdit } = setup({ active })

		api.onWrapperKeyDown(makeKeyEvent<HTMLTableElement>(key))

		expect(beginEdit).not.toHaveBeenCalled()
	})
})

describe('useGridEditableWrapper: onWrapperPaste', () => {
	function makePaste(text: string): ClipboardEvent<HTMLTableElement> {
		const dataTransfer: Partial<DataTransfer> = { getData: vi.fn(() => text) }

		const partial: Partial<ClipboardEvent<HTMLTableElement>> = {
			clipboardData: dataTransfer as DataTransfer,
			preventDefault: vi.fn(),
		}

		return partial as ClipboardEvent<HTMLTableElement>
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
		const { api, onValueChange } = setup({
			active: { row: 0, col: 0 },
			rows: [
				{ id: 'a', value: '' },
				{ id: 'b', value: '' },
			],
		})

		api.onWrapperPaste(makePaste('a1\tskip\nb1\tskip'))

		const changes = onValueChange.mock.calls[0]?.[0]

		expect(changes).toEqual([
			{ rowKey: 'a', columnId: 'value', value: 'a1' },
			{ rowKey: 'b', columnId: 'value', value: 'b1' },
		])
	})

	it('treats a spreadsheet single-cell paste with a trailing newline as a single cell', () => {
		const { api, applyCellWrite, onValueChange } = setup()

		// Excel/Sheets terminate text/plain with \r\n; the row below the target
		// must not be blanked by an empty trailing matrix row.
		api.onWrapperPaste(makePaste('hello\r\n'))

		expect(applyCellWrite).toHaveBeenCalledWith(0, 0, 'hello')

		expect(onValueChange).not.toHaveBeenCalled()
	})

	it('drops the empty trailing row of a matrix paste with a trailing newline', () => {
		const { api, onValueChange } = setup({
			active: { row: 0, col: 0 },
			rows: [
				{ id: 'a', value: '' },
				{ id: 'b', value: '' },
			],
		})

		api.onWrapperPaste(makePaste('a1\nb1\n'))

		const changes = onValueChange.mock.calls[0]?.[0]

		expect(changes).toEqual([
			{ rowKey: 'a', columnId: 'value', value: 'a1' },
			{ rowKey: 'b', columnId: 'value', value: 'b1' },
		])
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

describe('useGridEditableWrapper: onWrapperFocus and onWrapperBlur', () => {
	type FocusTarget = FocusEvent<HTMLTableElement>['target']

	type FocusRelated = FocusEvent<HTMLTableElement>['relatedTarget']

	function makeFocusEvent(
		target: Element | null,
		related: Element | null = null,
	): FocusEvent<HTMLTableElement> {
		const partial: Partial<FocusEvent<HTMLTableElement>> = {
			target: target as FocusTarget,
			relatedTarget: related as FocusRelated,
		}

		return partial as FocusEvent<HTMLTableElement>
	}

	it('onWrapperFocus moves focus to {0,0} when tabbing in from above', () => {
		const wrapper = document.createElement('table')

		document.body.appendChild(wrapper)

		const before = document.createElement('button')

		document.body.insertBefore(before, wrapper)

		const partialNav: Partial<GridEditableNavigationApi> = {
			active: null,
			anchor: null,
			extraCells: new Set(),
			activeRef: { current: null },
			moveActive: vi.fn(),
			moveActiveTo: vi.fn(),
			moveActiveTab: vi.fn(() => true),
			setActive: vi.fn(),
			setAnchor: vi.fn(),
			setExtraCells: vi.fn(),
		}

		const partialDraft: Partial<GridEditableDraftApi> = {
			editing: false,
			beginEdit: vi.fn(),
		}

		const { result } = renderHook(() =>
			useGridEditableWrapper<Row>({
				nav: partialNav as GridEditableNavigationApi,
				mutations: {
					applyCellWrite: vi.fn(),
					applyBulkFill: vi.fn(),
				},
				draft: partialDraft as GridEditableDraftApi,
				rows: {
					rowsRef: { current: [{ id: 'a', value: '' }] },
					editableCols: cols,
					getKey: (r) => r.id,
					formatCell: () => '',
					parseValue: (raw) => raw,
				},
				wrapperRef: { current: wrapper },
				onValueChange: vi.fn(),
				undo: vi.fn(),
				redo: vi.fn(),
			}),
		)

		result.current.onWrapperFocus(makeFocusEvent(wrapper, before))
	})

	it('onWrapperFocus seeds the last cell when focus enters from a real element after the grid', () => {
		const wrapper = document.createElement('table')

		document.body.appendChild(wrapper)

		// A focusable element after the table in the DOM — a Shift+Tab source.
		const after = document.createElement('button')

		document.body.appendChild(after)

		const { api, moveActiveTo } = setup({ wrapper, active: null })

		api.onWrapperFocus(makeFocusEvent(wrapper, after))

		// setup has 2 rows and 2 editable columns, so the last cell is {1, 1}.
		expect(moveActiveTo).toHaveBeenCalledWith({ row: 1, col: 1 })
	})

	it('onWrapperFocus does not seat a cell when focus returns from a floating menu portal', () => {
		const wrapper = document.createElement('table')

		document.body.appendChild(wrapper)

		// A menu item inside a floating-ui portal positioned after the table — what a
		// dismissed context menu hands focus back from. The cameFromAfter heuristic
		// would otherwise seat the last cell behind the menu.
		const portal = document.createElement('div')

		portal.setAttribute('data-floating-ui-portal', '')

		const menuItem = document.createElement('div')

		portal.appendChild(menuItem)

		document.body.appendChild(portal)

		const { api, moveActiveTo } = setup({ wrapper, active: null })

		api.onWrapperFocus(makeFocusEvent(wrapper, menuItem))

		expect(moveActiveTo).not.toHaveBeenCalled()
	})

	it('onWrapperBlur clears active, anchor, and extras when focus leaves the wrapper', () => {
		const wrapper = document.createElement('table')

		const { api, setActive, setAnchor, setExtraCells } = setup({
			wrapper,
			extras: new Set(['1,0']),
		})

		const external = document.createElement('button')

		api.onWrapperBlur(makeFocusEvent(wrapper, external))

		expect(setActive).toHaveBeenCalledWith(null)

		expect(setAnchor).toHaveBeenCalledWith(null)

		// Stale Ctrl-clicked extras must not survive blur to join a later bulk-fill.
		expect(setExtraCells).toHaveBeenCalledWith(new Set())
	})

	it('onWrapperBlur is a no-op when focus moves to a child of the wrapper', () => {
		const wrapper = document.createElement('table')

		const child = document.createElement('button')

		wrapper.appendChild(child)

		const { api, setActive, setAnchor } = setup({ wrapper })

		api.onWrapperBlur(makeFocusEvent(wrapper, child))

		expect(setActive).not.toHaveBeenCalled()

		expect(setAnchor).not.toHaveBeenCalled()
	})

	it('onWrapperBlur keeps the active cell when focus moves into a floating editor panel', () => {
		// A select/date editor opens a panel portalled outside the table; the
		// active cell must survive so the editor (and its panel) stay mounted.
		const wrapper = document.createElement('table')

		const portal = document.createElement('div')

		portal.setAttribute('data-floating-ui-portal', '')

		const option = document.createElement('div')

		portal.appendChild(option)

		document.body.appendChild(portal)

		const { api, setActive, setAnchor, setExtraCells } = setup({ wrapper })

		api.onWrapperBlur(makeFocusEvent(wrapper, option))

		expect(setActive).not.toHaveBeenCalled()

		expect(setAnchor).not.toHaveBeenCalled()

		expect(setExtraCells).not.toHaveBeenCalled()

		portal.remove()
	})
})

describe('useGridEditableWrapper: onWrapperMouseDown', () => {
	type MouseTarget = MouseEvent<HTMLTableElement>['target']

	function makeMouseEvent(target: Element, button: number) {
		const preventDefault = vi.fn()

		const partial: Partial<MouseEvent<HTMLTableElement>> = {
			button,
			target: target as MouseTarget,
			preventDefault,
		}

		return { event: partial as MouseEvent<HTMLTableElement>, preventDefault }
	}

	/** A detached `<table>` with a header cell and a body cell to classify a press against. */
	function makeTable() {
		const table = document.createElement('table')

		const thead = document.createElement('thead')

		const th = document.createElement('th')

		thead.append(th)

		const tbody = document.createElement('tbody')

		const td = document.createElement('td')

		tbody.append(td)

		table.append(thead, tbody)

		return { th, td }
	}

	it('suppresses the default focus on a right-click inside the header', () => {
		const { api } = setup()

		const { th } = makeTable()

		const { event, preventDefault } = makeMouseEvent(th, 2)

		api.onWrapperMouseDown(event)

		expect(preventDefault).toHaveBeenCalled()
	})

	it('suppresses the default focus on a middle-click inside the header', () => {
		const { api } = setup()

		const { th } = makeTable()

		const { event, preventDefault } = makeMouseEvent(th, 1)

		api.onWrapperMouseDown(event)

		expect(preventDefault).toHaveBeenCalled()
	})

	it('leaves a primary left-click on the header alone, so the cursor still seats on focus', () => {
		const { api } = setup()

		const { th } = makeTable()

		const { event, preventDefault } = makeMouseEvent(th, 0)

		api.onWrapperMouseDown(event)

		expect(preventDefault).not.toHaveBeenCalled()
	})

	it('leaves a right-click on a body cell alone, so the cell handler seats it for the menu', () => {
		const { api } = setup()

		const { td } = makeTable()

		const { event, preventDefault } = makeMouseEvent(td, 2)

		api.onWrapperMouseDown(event)

		expect(preventDefault).not.toHaveBeenCalled()
	})
})
