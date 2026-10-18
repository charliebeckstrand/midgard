// @vitest-environment node
import { describe, expect, it, vi } from 'vitest'
import {
	buildColumnGroupMenu,
	buildRowGroupMenu,
} from '../../modules/grid/grid-context-menu-utilities'
import type { GridMenuItem } from '../../modules/grid/types'
import { englishIntl, localeIntl } from '../../primitives/intl/intl-catalog'

/** The rows of a menu by label, and each separator as `---`. */
const shape = (items: GridMenuItem[]) =>
	items.map((item) => ('separator' in item ? '---' : item.label))

const rowArgs = {
	expanded: true,
	intl: englishIntl,
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
			intl: englishIntl,
			group: { id: 'g', title: 'G', columns: [], color: 'blue' },
			onClearColor,
			chooseColumns: null,
			manageLabel: 'Manage columns',
		}).at(-1)

		expect(row).toEqual(column)
	})
})

describe('the group menus in a locale', () => {
	it('labels the row-group menu in the language of the intl', () => {
		const items = buildRowGroupMenu({ ...rowArgs, intl: localeIntl('es-ES'), color: 'blue' })

		expect(shape(items)).toEqual([
			'Manage rows',
			'---',
			'Contraer el grupo',
			'Expandir todos los grupos',
			'Contraer todos los grupos',
			'---',
			'Quitar el color',
		])
	})
})
