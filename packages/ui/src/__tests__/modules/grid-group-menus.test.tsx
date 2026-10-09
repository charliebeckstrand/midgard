// @vitest-environment node
import { describe, expect, it, vi } from 'vitest'
import {
	buildColumnGroupMenu,
	buildRowGroupMenu,
} from '../../modules/grid/grid-context-menu-utilities'
import type { GridMenuItem } from '../../modules/grid/types'

/** The rows of a menu by label, and each separator as `---`. */
const shape = (items: GridMenuItem[]) =>
	items.map((item) => ('separator' in item ? '---' : item.label))

const rowArgs = {
	expanded: true,
	manageLabel: 'Manage rows',
	onManage: vi.fn(),
	onToggle: vi.fn(),
	onExpandAll: vi.fn(),
	onCollapseAll: vi.fn(),
	onClearColor: vi.fn(),
}

describe('buildRowGroupMenu', () => {
	it('rules Manage rows apart from the expand controls', () => {
		expect(shape(buildRowGroupMenu({ ...rowArgs, color: undefined }))).toEqual([
			'Manage rows',
			'---',
			'Collapse group',
			'Expand all groups',
			'Collapse all groups',
		])
	})

	it('adds Clear color under one more separator once the group has a color', () => {
		expect(shape(buildRowGroupMenu({ ...rowArgs, color: 'blue' }))).toEqual([
			'Manage rows',
			'---',
			'Collapse group',
			'Expand all groups',
			'Collapse all groups',
			'---',
			'Clear color',
		])
	})

	it('gives no two entries one key', () => {
		const keys = buildRowGroupMenu({ ...rowArgs, color: 'blue' }).map((item) => item.key)

		expect(new Set(keys).size).toBe(keys.length)
	})
})

describe('the Clear color item of the group menus', () => {
	it('is one item in the row-group and the column-group menu', () => {
		const onClearColor = vi.fn()

		const row = buildRowGroupMenu({ ...rowArgs, color: 'blue', onClearColor }).at(-1)

		const column = buildColumnGroupMenu({
			group: { id: 'g', title: 'G', columns: [], color: 'blue' },
			onClearColor,
			chooseColumns: null,
			manageLabel: 'Manage columns',
		}).at(-1)

		expect(row).toEqual(column)
	})
})
