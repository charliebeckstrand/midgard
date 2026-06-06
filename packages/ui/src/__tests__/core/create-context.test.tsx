import { renderHook } from '@testing-library/react'
import type { ReactNode } from 'react'
import { describe, expect, it } from 'vitest'
import { createContext } from '../../core/create-context'

describe('createContext', () => {
	it('hook returns provided value when used within provider', () => {
		const [Provider, useValue] = createContext<string>('Test')

		const { result } = renderHook(() => useValue(), {
			wrapper: ({ children }: { children: ReactNode }) => (
				<Provider value="hello">{children}</Provider>
			),
		})

		expect(result.current).toBe('hello')
	})

	it('hook throws error when used outside provider', () => {
		const [, useValue] = createContext<string>('Test')

		expect(() => renderHook(() => useValue())).toThrow()
	})

	it('error message includes context name', () => {
		const [, useValue] = createContext<string>('Dialog')

		expect(() => renderHook(() => useValue())).toThrow('useDialog must be used within <Dialog>')
	})

	it('error option overrides the default thrown message', () => {
		const [, useValue] = createContext<string>('Dialog', { error: 'wrap me in <Surrounding>' })

		expect(() => renderHook(() => useValue())).toThrow('wrap me in <Surrounding>')
	})

	it('names the context for React DevTools', () => {
		const [Context] = createContext<string>('Density', { default: '' })

		expect(Context.displayName).toBe('Density')
	})
})
