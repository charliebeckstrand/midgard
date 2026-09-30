// @vitest-environment node
import { describe, expect, it } from 'vitest'
import { readoutToCsv } from '../../modules/chart/engine/chart-export'

/**
 * The CSV export writes the same category × series grid as the hidden data
 * table. The formula-lead guards live beside the context menu that calls it.
 */
describe('readoutToCsv grid', () => {
	it('writes an empty cell where a series has no value for a category', () => {
		const csv = readoutToCsv({
			categories: ['Q1', 'Q2', 'Q3'],
			rows: [
				{ label: 'Revenue', swatchClass: '', swatch: 'rect', values: ['10', '20', '30'] },
				{ label: 'Margin', swatchClass: '', swatch: 'rect', values: ['4'] },
			],
		})

		expect(csv.split('\r\n')).toEqual([',Revenue,Margin', 'Q1,10,4', 'Q2,20,', 'Q3,30,'])
	})
})
