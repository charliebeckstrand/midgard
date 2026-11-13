// @vitest-environment jsdom
import { cleanup, renderHook } from '@testing-library/react'
import { StrictMode } from 'react'
import { afterEach, describe, expect, it } from 'vitest'
import { useLinkToken } from '../auth/use-link-token'

afterEach(() => {
	cleanup()
})

describe('useLinkToken', () => {
	it('keeps the token of the first run when Strict Mode runs the effect again', () => {
		window.history.replaceState(null, '', '/reset-password?token=abc')

		const { result } = renderHook(() => useLinkToken(), { wrapper: StrictMode })

		// The second run finds no token in the address bar.
		expect(window.location.search).toBe('')

		expect(result.current()).toBe('abc')
	})
})
