'use client'

import { type Provider, createContext as reactCreateContext, useContext } from 'react'

export function createContext<T>(name: string): [Provider<T>, () => T] {
	const Context = reactCreateContext<T | null>(null)

	function useContextValue(): T {
		const value = useContext(Context)

		if (value === null) {
			throw new Error(`use${name} must be used within <${name}>`)
		}

		return value
	}

	return [Context.Provider as unknown as Provider<T>, useContextValue]
}
