// @vitest-environment jsdom
import { readFileSync } from 'node:fs'
import { join } from 'node:path'
import { act, createElement } from 'react'
import { hydrateRoot } from 'react-dom/client'
import { renderToString } from 'react-dom/server'
import { describe, expect, it, vi } from 'vitest'
import { AppProviders } from '../providers'

const START = '<template data-shell="start"></template>'

const END = '<template data-shell="end"></template>'

const page = createElement(AppProviders, null, createElement('main', null, 'The page'))

/** The selector of the rule in `globals.css` that keeps a page out of view until its shell ends. */
function holdSelector(): string {
	const css = readFileSync(join(import.meta.dirname, '../globals.css'), 'utf8')

	const selector = css.match(/^(body:has\(> template\[data-shell='start'\]\)[^{]*)\{/m)?.[1]

	if (selector === undefined) throw new Error('globals.css has no rule for the shell marks.')

	return selector.trim()
}

/** Whether the rule holds a body with the given content. */
function holds(html: string): boolean {
	document.body.innerHTML = html

	return document.body.matches(holdSelector())
}

describe('the shell marks of AppProviders', () => {
	it('enclose the server markup of the providers, so the end mark comes after the page', () => {
		// In a test, React writes the hoisted font preload before the markup. In a page, it goes in the head.
		const html = renderToString(page)

		expect(html.indexOf(START)).toBeGreaterThan(-1)

		expect(html.indexOf(START)).toBeLessThan(html.indexOf('The page'))

		expect(html.endsWith(`The page</main>${END}`)).toBe(true)
	})

	it('hold the page while only the start mark is parsed', () => {
		expect(holds(`${START}<main>The page</main>`)).toBe(true)
	})

	it('release the page once the end mark is parsed', () => {
		expect(holds(`${START}<main>The page</main>${END}`)).toBe(false)
	})

	it('never hold a body with no start mark, such as the global error page', () => {
		expect(holds('<main>Something went wrong</main>')).toBe(false)
	})

	it('hydrate with no recoverable error', async () => {
		document.body.innerHTML = renderToString(page)

		const onRecoverableError = vi.fn()

		await act(async () => {
			hydrateRoot(document.body, page, { onRecoverableError })
		})

		expect(onRecoverableError).not.toHaveBeenCalled()

		expect(document.body.lastElementChild?.getAttribute('data-shell')).toBe('end')
	})
})
