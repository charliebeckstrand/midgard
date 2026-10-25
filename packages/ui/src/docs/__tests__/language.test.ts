// @vitest-environment node
import { mkdir, mkdtemp, rm, writeFile } from 'node:fs/promises'
import { tmpdir } from 'node:os'
import path from 'node:path'
import { afterAll, beforeAll, describe, expect, it } from 'vitest'
import { resolveFile, targetPathname } from '../../../scripts/docs-server.ts'
import { localeFile, requestLocale } from '../app/language.ts'

// The docs have the HTML of each page in each locale, and the server sends the
// HTML of the locale of the request at the same path.

describe('requestLocale', () => {
	it('takes the locale of the cookie, else the match of Accept-Language, else English', () => {
		expect(requestLocale({ cookie: 'theme=dark; locale=es', acceptLanguage: 'en-US' })).toBe('es')

		expect(requestLocale({ cookie: 'locale=system', acceptLanguage: 'es-MX,es;q=0.9' })).toBe('es')

		expect(requestLocale({ acceptLanguage: 'fr-FR,fr;q=0.9' })).toBe('en')

		expect(requestLocale({ cookie: 'locale=%E0%A4%A' })).toBe('en')
	})
})

describe('localeFile', () => {
	it('names the HTML file of a page in a locale', () => {
		expect(localeFile('index.html', 'en')).toBe('index.html')

		expect(localeFile('index.html', 'es')).toBe('index.es.html')

		expect(localeFile('__spa-fallback.html', 'es')).toBe('__spa-fallback.es.html')
	})
})

describe('targetPathname', () => {
	it('gives the path of a target, with no parse of a host', () => {
		expect(targetPathname('/button?tab=code')).toBe('/button')

		expect(targetPathname('//button')).toBe('//button')

		expect(targetPathname('//[')).toBe('//[')

		expect(targetPathname('//:99999')).toBe('//:99999')
	})

	it('gives no path for a target that does not start with a slash', () => {
		expect(targetPathname('http://a:99999/')).toBeUndefined()

		expect(targetPathname('*')).toBeUndefined()
	})
})

describe('resolveFile', () => {
	let root = ''

	beforeAll(async () => {
		root = await mkdtemp(path.join(tmpdir(), 'docs-'))

		await mkdir(path.join(root, 'button'))

		await mkdir(path.join(root, 'badge'))

		for (const file of [
			'button/index.html',
			'button/index.es.html',
			'badge/index.html',
			'__spa-fallback.html',
			'__spa-fallback.es.html',
		]) {
			await writeFile(path.join(root, file), file)
		}
	})

	afterAll(() => rm(root, { recursive: true, force: true }))

	it('gives the HTML of a page in the locale of the request', async () => {
		expect(await resolveFile(root, '/button', 'es')).toBe(path.join(root, 'button/index.es.html'))

		expect(await resolveFile(root, '/button', 'en')).toBe(path.join(root, 'button/index.html'))

		expect(await resolveFile(root, '/nope', 'es')).toBe(path.join(root, '__spa-fallback.es.html'))
	})

	it('gives the page of a path with a double slash', async () => {
		expect(await resolveFile(root, '//button', 'en')).toBe(path.join(root, 'button/index.html'))

		expect(await resolveFile(root, '//[', 'en')).toBe(path.join(root, '__spa-fallback.html'))
	})

	it('gives no file for a target with no path or a path that does not decode', async () => {
		expect(await resolveFile(root, 'http://a:99999/')).toBeUndefined()

		expect(await resolveFile(root, '/%E0%A4%A')).toBeUndefined()
	})

	it('gives the HTML of the default locale when the page has no HTML in the locale', async () => {
		expect(await resolveFile(root, '/badge', 'es')).toBe(path.join(root, 'badge/index.html'))
	})
})
