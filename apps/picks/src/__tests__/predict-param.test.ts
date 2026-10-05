import { describe, expect, it } from 'vitest'
import { predictValue, readPredictValue } from '../utilities/predict-param'

describe('predict parameter', () => {
	it('reads the week back from the value it writes', () => {
		expect(readPredictValue(predictValue(12))).toBe(12)
	})

	it.each([null, '', 'w', 'w0', '5', 'w05', 'week5', 'w100'])('reads %j as no week', (value) => {
		expect(readPredictValue(value)).toBeNull()
	})
})
