import { describe, expect, it } from 'vitest'
import { parseSetting, readSettings, SETTINGS } from '../utilities/settings'

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
	})
})

describe('readSettings', () => {
	it('reads each setting from its cookie', () => {
		const cookies: Record<string, string> = {
			[SETTINGS.autoDraw.cookie]: 'off',
			[SETTINGS.showScore.cookie]: 'off',
		}

		expect(readSettings((name) => cookies[name])).toEqual({ autoDraw: false, showScore: false })
	})

	it('gives the defaults with no cookies', () => {
		expect(readSettings(() => undefined)).toEqual({ autoDraw: true, showScore: true })
	})
})
