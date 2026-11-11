import { describe, expect, it } from 'vitest'
import { formatPredictValue, parsePredictValue } from '../utilities/predict-param'

describe('predict parameter', () => {
	it('reads the week back from the value it writes', () => {
		expect(parsePredictValue(formatPredictValue(12))).toBe(12)
	})

	it.each([null, '', 'w', 'w0', '5', 'w05', 'week5', 'w100'])('reads %j as no week', (value) => {
		expect(parsePredictValue(value)).toBeNull()
	})
})
