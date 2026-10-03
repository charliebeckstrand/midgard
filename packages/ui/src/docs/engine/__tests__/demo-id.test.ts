// @vitest-environment node
import { describe, expect, it } from 'vitest'
import { demoPath, pageTabPath, parseDemoPath } from '../demo-id'

describe('demoPath', () => {
	it('puts a namespaced page in the folder of its namespace', () => {
		expect(demoPath('structure-box')).toBe('/structure/box')

		expect(demoPath('modules-chart', 'pie')).toBe('/modules/chart/pie')
	})

	it('keeps a component page at its id', () => {
		expect(demoPath('card')).toBe('/card')

		expect(demoPath('copy-button')).toBe('/copy-button')

		expect(demoPath('progress', 'gauge')).toBe('/progress/gauge')
	})

	it('gives the default tab the path of the page', () => {
		expect(pageTabPath('modules-grid', 'variants', 'variants')).toBe('/modules/grid')

		expect(pageTabPath('modules-grid', 'sorting', 'variants')).toBe('/modules/grid/sorting')
	})
})

describe('parseDemoPath', () => {
	it('reads the id and the tab of each path that demoPath gives', () => {
		for (const [id, tab] of [
			['structure-box', undefined],
			['modules-chart', 'pie'],
			['card', undefined],
			['copy-button', undefined],
			['progress', 'gauge'],
		] as const) {
			expect(parseDemoPath(demoPath(id, tab))).toEqual({ id, tab })
		}
	})

	it('reads a path from before nested paths as the same page', () => {
		expect(parseDemoPath('/structure-box')).toEqual({ id: 'structure-box', tab: undefined })

		expect(parseDemoPath('/modules-grid/Sorting')).toEqual({ id: 'modules-grid', tab: 'Sorting' })
	})

	it('ignores a trailing slash, and gives an empty id at the root', () => {
		expect(parseDemoPath('/structure/box/')).toEqual({ id: 'structure-box', tab: undefined })

		expect(parseDemoPath('/')).toEqual({ id: '', tab: undefined })
	})

	it('reads a malformed escape as a part, and does not throw', () => {
		expect(parseDemoPath('/%ZZ')).toEqual({ id: '%ZZ', tab: undefined })
	})
})
