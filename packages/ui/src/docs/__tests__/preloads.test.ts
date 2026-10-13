// @vitest-environment node
import { describe, expect, it } from 'vitest'
import { lowerPreloads } from '../plugin/preloads.ts'

describe('lowerPreloads', () => {
	it('gives each module link the low priority', () => {
		const html =
			'<head><link rel="modulepreload" href="/assets/a.js"/><link rel="modulepreload" href="/assets/b.js" crossorigin=""/></head>'

		expect(lowerPreloads(html)).toBe(
			'<head><link rel="modulepreload" href="/assets/a.js" fetchpriority="low"/><link rel="modulepreload" href="/assets/b.js" crossorigin="" fetchpriority="low"/></head>',
		)
	})

	it('keeps the priority of a link that has one, and each other link', () => {
		const html =
			'<link rel="modulepreload" href="/assets/a.js" fetchpriority="high"/><link rel="stylesheet" href="/assets/app.css"/><script src="/assets/font.js"></script>'

		expect(lowerPreloads(html)).toBe(html)
	})
})
