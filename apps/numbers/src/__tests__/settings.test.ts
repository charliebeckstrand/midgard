import { describe, expect, it } from 'vitest'
import { formatSetting, parseSetting, readSettings, SETTINGS } from '../utilities/settings'

describe('parseSetting', () => {
	it('reads on and off', () => {
		expect(parseSetting('autoDraw', 'on')).toBe(true)
		expect(parseSetting('autoDraw', 'off')).toBe(false)
		expect(parseSetting('showScore', 'off')).toBe(false)
	})

	it('gives the default for a missing or an unknown value', () => {
		expect(parseSetting('autoDraw', undefined)).toBe(true)
		expect(parseSetting('showScore', undefined)).toBe(true)
		expect(parseSetting('showScore', 'yes')).toBe(true)
		expect(parseSetting('placementOrder', undefined)).toBe(true)
		expect(parseSetting('difficulty', undefined)).toBe('normal')
		expect(parseSetting('difficulty', 'expert')).toBe('normal')
		expect(parseSetting('difficulty', 'toString')).toBe('normal')
	})

	it('reads each level of the CPU', () => {
		expect(parseSetting('difficulty', 'easy')).toBe('easy')
		expect(parseSetting('difficulty', 'hard')).toBe('hard')
	})
})

describe('formatSetting', () => {
	it('gives the cookie value that parseSetting reads', () => {
		expect(formatSetting('autoDraw', true)).toBe('on')
		expect(formatSetting('showScore', false)).toBe('off')
		expect(formatSetting('difficulty', 'hard')).toBe('hard')
	})
})

describe('readSettings', () => {
	it('reads each setting from its cookie', () => {
		const cookies: Record<string, string> = {
			[SETTINGS.autoDraw.cookie]: 'off',
			[SETTINGS.showScore.cookie]: 'off',
			[SETTINGS.placementOrder.cookie]: 'off',
			[SETTINGS.difficulty.cookie]: 'easy',
		}

		expect(readSettings((name) => cookies[name])).toEqual({
			autoDraw: false,
			showScore: false,
			placementOrder: false,
			difficulty: 'easy',
		})
	})

	it('gives the defaults with no cookies', () => {
		expect(readSettings(() => undefined)).toEqual({
			autoDraw: true,
			showScore: true,
			placementOrder: true,
			difficulty: 'normal',
		})
	})
})
