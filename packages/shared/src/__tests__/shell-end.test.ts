// @vitest-environment jsdom
import { act, createElement } from 'react'
import { hydrateRoot, type Root } from 'react-dom/client'
import { renderToString } from 'react-dom/server'
import { describe, expect, it, onTestFinished, vi } from 'vitest'
import { AppProviders } from '../providers'

/** The providers around a page. Each render takes a new tree. */
const page = () => createElement(AppProviders, null, createElement('main', null, 'The page'))

/** The server markup of a whole document whose body holds the providers. */
function serverDocument(): Document {
	const html = renderToString(
		createElement('html', null, createElement('head'), createElement('body', null, page())),
	)

	return new DOMParser().parseFromString(html, 'text/html')
}

describe('the shell end of AppProviders', () => {
	it('puts a render-blocking link in the head, which names the end mark', () => {
		const link = serverDocument().head.querySelector('link[rel="expect"]')

		expect(link?.getAttribute('href')).toBe('#shell-end')

		expect(link?.getAttribute('blocking')).toBe('render')
	})

	it('puts the end mark after the page, as the last element of the body', () => {
		const body = serverDocument().body

		expect(body.lastElementChild?.id).toBe('shell-end')

		expect(body.querySelector('main')?.compareDocumentPosition(body.lastElementChild as Node)).toBe(
			Node.DOCUMENT_POSITION_FOLLOWING,
		)
	})

	it('hydrates with no recoverable error', async () => {
		vi.stubGlobal('IS_REACT_ACT_ENVIRONMENT', true)

		let root: Root | undefined

		// Nothing else unmounts a root that `hydrateRoot` made, or empties the body.
		onTestFinished(() => {
			act(() => root?.unmount())

			document.body.replaceChildren()
		})

		document.body.innerHTML = serverDocument().body.innerHTML

		const onRecoverableError = vi.fn()

		await act(async () => {
			root = hydrateRoot(document.body, page(), { onRecoverableError })
		})

		expect(onRecoverableError).not.toHaveBeenCalled()

		expect(document.body.lastElementChild?.id).toBe('shell-end')
	})
})
