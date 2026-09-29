// @vitest-environment node
import { describe, expect, it } from 'vitest'
import { chartFileName } from '../../modules/chart/engine/chart-export'

/**
 * The export filename comes from the chart title. The slug keeps the letters and
 * digits of every script. It folds a Latin accent to its base letter, and it
 * keeps a mark that a script needs, such as a Devanagari vowel sign.
 */
describe('chartFileName', () => {
	it.each<[string | undefined, string]>([
		['Revenue by Quarter', 'revenue-by-quarter.png'],
		['Umsätze München', 'umsatze-munchen.png'],
		['売上', '売上.png'],
		['Выручка 2026', 'выручка-2026.png'],
		['बिक्री', 'बिक्री.png'],
		['매출 현황', '매출-현황.png'],
		['  Q1 — 2026!  ', 'q1-2026.png'],
		['***', 'chart.png'],
		[undefined, 'chart.png'],
	])('names %j as %j', (title, name) => {
		expect(chartFileName(title, 'png')).toBe(name)
	})
})
