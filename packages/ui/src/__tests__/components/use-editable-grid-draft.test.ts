import { act, renderHook } from '@testing-library/react'
import type { RefObject } from 'react'
import { describe, expect, it, vi } from 'vitest'
import type {
	EditableGridColumn,
	EditableGridMutationsApi,
	EditableGridNavigationApi,
	EditableGridRowsApi,
} from '../../components/editable-grid/types'
import { useEditableGridDraft } from '../../components/editable-grid/use-editable-grid-draft'

type Row = { id: string; value: string }

const cols: EditableGridColumn<Row>[] = [
	{ id: 'value', title: 'Value' } as EditableGridColumn<Row>,
	{ id: 'readonly', title: 'RO', readOnly: true } as EditableGridColumn<Row>,
]

type Overrides = Partial<{
	anchor: { row: number; col: number } | null
	extras: Set<string>
	moveActiveTabResult: boolean
	wrapper: HTMLTableElement | null
	active: { row: number; col: number } | null
}>

function setup(overrides: Overrides = {}) {
	const moveActive = vi.fn()

	const moveActiveTab = vi.fn(() => overrides.moveActiveTabResult ?? true)

	const setActive = vi.fn()

	const applyCellWrite = vi.fn()

	const applyBulkFill = vi.fn()

	const wrapper =
		overrides.wrapper === undefined ? document.createElement('table') : overrides.wrapper

	const focusSpy = wrapper ? vi.spyOn(wrapper, 'focus') : null

	const partialNav: Partial<EditableGridNavigationApi> = {
		active: overrides.active ?? { row: 0, col: 0 },
		anchor: overrides.anchor ?? null,
		extraCells: overrides.extras ?? new Set(),
		anchorRef: { current: overrides.anchor ?? null },
		extraCellsRef: { current: overrides.extras ?? new Set() },
		activeRef: { current: overrides.active ?? { row: 0, col: 0 } },
		moveActive,
		moveActiveTab,
		setActive,
		setAnchor: vi.fn(),
		setExtraCells: vi.fn(),
		moveActiveTo: vi.fn(),
	}

	const nav = partialNav as EditableGridNavigationApi

	const mutations: EditableGridMutationsApi = { applyCellWrite, applyBulkFill }

	const partialRows: Partial<EditableGridRowsApi<Row>> = {
		rowsRef: {
			current: [
				{ id: 'a', value: 'a1' },
				{ id: 'b', value: 'b1' },
			] as Row[],
		},
		editableCols: cols,
		getKey: (r: Row) => r.id,
		formatCell: (row: Row, col: EditableGridColumn<Row>) => String(row[col.id as keyof Row] ?? ''),
		parseValue: (raw: string) => raw,
	}

	const rowsApi = partialRows as EditableGridRowsApi<Row>

	const wrapperRef = { current: wrapper } as RefObject<HTMLTableElement | null>

	const { result } = renderHook(() =>
		useEditableGridDraft<Row>({ nav, mutations, rows: rowsApi, wrapperRef }),
	)

	return {
		api: result,
		moveActive,
		moveActiveTab,
		setActive,
		applyCellWrite,
		applyBulkFill,
		focusSpy,
	}
}

describe('useEditableGridDraft: beginEdit', () => {
	it('seeds the draft with the supplied initial value and marks editing=true', () => {
		const { api } = setup()

		act(() => api.current.beginEdit({ row: 0, col: 0 }, 'hello'))

		expect(api.current.editing).toBe(true)

		expect(api.current.draft).toBe('hello')
	})

	it('defaults the draft to an empty string when no initial value is supplied', () => {
		const { api } = setup()

		act(() => api.current.beginEdit({ row: 0, col: 0 }))

		expect(api.current.draft).toBe('')
	})

	it('moves the active cell to the edited coord', () => {
		const { api, setActive } = setup()

		act(() => api.current.beginEdit({ row: 1, col: 0 }, 'b'))

		expect(setActive).toHaveBeenCalledWith({ row: 1, col: 0 })
	})

	it('is a no-op on a read-only column', () => {
		const { api, setActive } = setup()

		act(() => api.current.beginEdit({ row: 0, col: 1 }, 'x'))

		expect(api.current.editing).toBe(false)

		expect(setActive).not.toHaveBeenCalled()
	})

	it('is a no-op when the column is out of range', () => {
		const { api } = setup()

		act(() => api.current.beginEdit({ row: 0, col: 99 }, 'x'))

		expect(api.current.editing).toBe(false)
	})
})

describe('useEditableGridDraft: commitEdit', () => {
	it('routes to applyCellWrite when there is no multi-selection and the draft changed', () => {
		const { api, applyCellWrite, applyBulkFill } = setup()

		act(() => api.current.beginEdit({ row: 0, col: 0 }, '', ''))

		act(() => {
			api.current.setDraft('new')
		})

		act(() => {
			api.current.commitEdit('none')
		})

		expect(applyCellWrite).toHaveBeenCalledWith(0, 0, 'new')

		expect(applyBulkFill).not.toHaveBeenCalled()
	})

	it('routes to applyBulkFill when an anchor is present', () => {
		const { api, applyBulkFill, applyCellWrite } = setup({ anchor: { row: 1, col: 0 } })

		act(() => api.current.beginEdit({ row: 0, col: 0 }, '', ''))

		act(() => api.current.setDraft('bulk'))

		act(() => {
			api.current.commitEdit('none')
		})

		expect(applyBulkFill).toHaveBeenCalledWith('bulk')

		expect(applyCellWrite).not.toHaveBeenCalled()
	})

	it('routes to applyBulkFill when extra cells are present', () => {
		const { api, applyBulkFill } = setup({ extras: new Set(['1,0']) })

		act(() => api.current.beginEdit({ row: 0, col: 0 }, '', ''))

		act(() => api.current.setDraft('bulk'))

		act(() => {
			api.current.commitEdit('none')
		})

		expect(applyBulkFill).toHaveBeenCalledWith('bulk')
	})

	it('skips write when the draft matches the original formatted value', () => {
		// Lossy format→parse does not overwrite an unchanged cell.
		const { api, applyCellWrite } = setup()

		act(() => api.current.beginEdit({ row: 0, col: 0 }, '$2.35', '$2.35'))

		act(() => api.current.setDraft('$2.35'))

		act(() => {
			api.current.commitEdit('none')
		})

		expect(applyCellWrite).not.toHaveBeenCalled()
	})

	it('returns true and is a no-op on the second commit in a single session', () => {
		const { api, applyCellWrite } = setup()

		act(() => api.current.beginEdit({ row: 0, col: 0 }, ''))

		act(() => api.current.setDraft('first'))

		let secondReturn: boolean | undefined

		act(() => {
			api.current.commitEdit('none')
		})

		act(() => {
			secondReturn = api.current.commitEdit('none')
		})

		expect(secondReturn).toBe(true)

		// applyCellWrite runs only on the first commit.
		expect(applyCellWrite).toHaveBeenCalledTimes(1)
	})

	it('advance="down" calls moveActive(1, 0)', () => {
		const { api, moveActive } = setup()

		act(() => api.current.beginEdit({ row: 0, col: 0 }, ''))

		act(() => {
			api.current.commitEdit('down')
		})

		expect(moveActive).toHaveBeenCalledWith(1, 0)
	})

	it('advance="right" delegates to moveActiveTab(1)', () => {
		const { api, moveActiveTab } = setup()

		act(() => api.current.beginEdit({ row: 0, col: 0 }, ''))

		act(() => {
			api.current.commitEdit('right')
		})

		expect(moveActiveTab).toHaveBeenCalledWith(1)
	})

	it('advance="left" delegates to moveActiveTab(-1)', () => {
		const { api, moveActiveTab } = setup()

		act(() => api.current.beginEdit({ row: 0, col: 0 }, ''))

		act(() => {
			api.current.commitEdit('left')
		})

		expect(moveActiveTab).toHaveBeenCalledWith(-1)
	})

	it('does not refocus the wrapper when Tab leaves the grid', () => {
		const { api, focusSpy } = setup({ moveActiveTabResult: false })

		act(() => api.current.beginEdit({ row: 0, col: 0 }, ''))

		focusSpy?.mockClear()

		act(() => {
			api.current.commitEdit('right')
		})

		expect(focusSpy).not.toHaveBeenCalled()
	})

	it('refocuses the wrapper after a stay-in-grid commit', () => {
		const { api, focusSpy } = setup()

		act(() => api.current.beginEdit({ row: 0, col: 0 }, ''))

		focusSpy?.mockClear()

		act(() => {
			api.current.commitEdit('none')
		})

		expect(focusSpy).toHaveBeenCalled()
	})
})

describe('useEditableGridDraft: cancelEdit', () => {
	it('clears the draft, exits editing, and refocuses the wrapper', () => {
		const { api, focusSpy } = setup()

		act(() => api.current.beginEdit({ row: 0, col: 0 }, 'hello'))

		focusSpy?.mockClear()

		act(() => api.current.cancelEdit())

		expect(api.current.editing).toBe(false)

		expect(api.current.draft).toBe('')

		expect(focusSpy).toHaveBeenCalled()
	})
})
