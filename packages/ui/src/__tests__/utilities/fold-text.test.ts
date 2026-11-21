// @vitest-environment node
import { describe, expect, it } from 'vitest'
import { foldText } from '../../utilities/fold-text'

describe('foldText', () => {
	it('removes the accents and lowers the case', () => {
		expect(foldText('Pão de Açúcar')).toBe('pao de acucar')

		expect(foldText('Café')).toBe('cafe')

		expect(foldText('González')).toBe('gonzalez')
	})

	it('keeps the letters of a script with no accents', () => {
		expect(foldText('売上')).toBe('売上')
	})

	it('folds a query and a text to one form', () => {
		expect(foldText('CAFÉ')).toBe(foldText('cafe'))
	})
})
