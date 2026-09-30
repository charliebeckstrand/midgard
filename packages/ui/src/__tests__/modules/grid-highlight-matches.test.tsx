import { describe, expect, it } from 'vitest'
import { highlightMatches } from '../../modules/grid/grid-highlight-utilities'
import { renderUI } from '../helpers'

/** The texts of the marks that `highlightMatches` puts in `text`. */
function marksOf(text: string, query: string): string[] {
	const { container } = renderUI(<p>{highlightMatches(text, query)}</p>)

	return [...container.querySelectorAll('mark')].map((mark) => mark.textContent ?? '')
}

describe('highlightMatches', () => {
	it('marks each case-insensitive match in its original casing', () => {
		expect(marksOf('Ada and ADA', 'ada')).toEqual(['Ada', 'ADA'])
	})

	it('marks the match after a character that lowercases to two code units', () => {
		// `İ` lowercases to `i̇`, two code units, so the lowered offsets run one
		// ahead of the original ones after it.
		expect(marksOf('İstanbul Ada', 'ada')).toEqual(['Ada'])
	})

	it('marks a query that holds a character that lowercases to two code units', () => {
		expect(marksOf('İzmir', 'İz')).toEqual(['İz'])
	})
})
