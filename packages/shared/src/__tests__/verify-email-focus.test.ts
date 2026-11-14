// @vitest-environment jsdom
import { act, createElement } from 'react'
import { createRoot, type Root } from 'react-dom/client'
import { LocaleProvider, type LocaleProviderProps } from 'ui/providers/locale'
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import { bifrost } from '../auth/bifrost'
import { VerifyEmailPage } from '../auth/verify-email-page'
import { catalogs } from '../locale/catalogs'

vi.mock('../auth/bifrost', () => ({ bifrost: { POST: vi.fn() } }))

vi.mock('../link-secrets', () => ({ getLinkSecret: () => 'token' }))

// React asks for this flag before it lets `act` flush the work of a test.
Object.assign(globalThis, { IS_REACT_ACT_ENVIRONMENT: true })

let root: Root

let host: HTMLElement

beforeEach(async () => {
	host = document.body.appendChild(document.createElement('div'))

	root = createRoot(host)

	// The third argument gives the children, which the props type requires.
	const props = { locale: 'en', catalogs } as LocaleProviderProps

	await act(async () =>
		root.render(createElement(LocaleProvider, props, createElement(VerifyEmailPage))),
	)
})

afterEach(() => {
	act(() => root.unmount())

	host.remove()
})

// A request that stays open until the test answers it.
function pending() {
	let resolve!: (answer: { response: Response; error?: { message: string } }) => void

	const promise = new Promise<{ response: Response; error?: { message: string } }>((done) => {
		resolve = done
	})

	return { promise, resolve }
}

/** Focuses the button as a keyboard user does, and presses it. */
async function press() {
	const button = host.querySelector('button') as HTMLButtonElement

	button.focus()

	await act(async () => button.click())

	return button
}

describe('VerifyEmailPage focus', () => {
	it('keeps the focus on the button while the request is open, and after it fails', async () => {
		const request = pending()

		vi.mocked(bifrost.POST).mockReturnValue(request.promise as never)

		const button = await press()

		// A browser moves the focus off a control that turns disabled. jsdom does
		// not, so the case reads the attribute too.
		expect(button.disabled).toBe(false)

		expect(document.activeElement).toBe(button)

		await act(async () =>
			request.resolve({
				response: new Response(null, { status: 400 }),
				error: { message: 'Expired' },
			}),
		)

		expect(document.activeElement).toBe(button)
	})

	it('moves the focus to the link that replaces the button after a success', async () => {
		vi.mocked(bifrost.POST).mockResolvedValue({
			response: new Response(null, { status: 204 }),
		} as never)

		await press()

		expect(host.querySelector('button')).toBeNull()

		expect(document.activeElement).toBe(host.querySelector('a[href="/"]'))
	})
})
