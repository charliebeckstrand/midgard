import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import { cleanup, fireEvent, render, screen } from '@testing-library/react'
import { UIProvider } from 'ui/providers/ui'
import { afterEach, describe, expect, it, vi } from 'vitest'
import {
	confirmTotp,
	type Factors,
	startTotpSetup,
} from '../../app/(signed-in)/account/account-api'
import { TwoStep } from '../../app/(signed-in)/account/two-step'

vi.mock('../../app/(signed-in)/account/account-api', () => ({
	confirmTotp: vi.fn(async () => undefined),
	generateRecoveryCodes: vi.fn(),
	removeTotp: vi.fn(),
	startTotpSetup: vi.fn(async () => ({ secret: 'JBSWY3DPEHPK3PXP', uri: 'otpauth://totp/test' })),
}))

// The QR code is a canvas, and jsdom draws no canvas.
vi.mock('../../app/(signed-in)/account/qr-code', () => ({ QrCode: () => null }))

afterEach(cleanup)

/** The factors of a user with the given count of recovery codes. */
function factors(overrides: Partial<Factors>): Factors {
	return { enabled: false, passkeys: 0, totp: false, recovery_codes: 0, ...overrides }
}

/** Renders the card with the providers of the signed-in pages. */
function renderTwoStep(value: Factors) {
	const client = new QueryClient({ defaultOptions: { mutations: { retry: false } } })

	return render(
		<QueryClientProvider client={client}>
			<UIProvider>
				<TwoStep factors={value} admin={false}>
					{null}
				</TwoStep>
			</UIProvider>
		</QueryClientProvider>,
	)
}

describe('TwoStep', () => {
	it('does not turn on the authenticator app when the user cancels the setup', async () => {
		renderTwoStep(factors({}))

		fireEvent.click(screen.getByRole('button', { name: 'Add' }))

		const code = await screen.findByLabelText('Code from the app')

		fireEvent.change(code, { target: { value: '123456' } })

		// A click from a script submits the form before React removes it. A click
		// from a pointer or a key lets React remove the form first.
		fireEvent.click(screen.getByRole('button', { name: 'Cancel' }))

		expect(await screen.findByRole('button', { name: 'Add' })).toBeTruthy()
		expect(startTotpSetup).toHaveBeenCalledOnce()
		expect(confirmTotp).not.toHaveBeenCalled()
	})

	it('gives the count of one recovery code in the singular', () => {
		renderTwoStep(factors({ enabled: true, recovery_codes: 1 }))

		expect(screen.getByText('You have 1 unused recovery code.')).toBeTruthy()
	})

	it('gives the count of more recovery codes in the plural', () => {
		renderTwoStep(factors({ enabled: true, recovery_codes: 8 }))

		expect(screen.getByText('You have 8 unused recovery codes.')).toBeTruthy()
	})
})
