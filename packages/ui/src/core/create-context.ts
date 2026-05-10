'use client'

import { type Provider, createContext as reactCreateContext, useContext } from 'react'

const MISSING = Symbol('createContext.missing')

type Options<T> = {
	/** Returned by the hook when consumed outside a provider. */
	default: T
}

/**
 * Creates a typed context with a Provider and a consumer hook.
 *
 * - Without options, the hook throws when used outside a provider — for
 *   required context (Menu, Tabs, Dialog, etc.).
 * - With `{ default }`, the hook returns the default when used outside a
 *   provider — for optional / ambient context (Glass, Skeleton, Concentric,
 *   Alert, Control, etc.).
 *
 * @example
 *   // Required:
 *   export const [TabsProvider, useTabs] = createContext<TabsContext>('Tabs')
 *
 *   // Optional with a value default:
 *   export const [GlassProvider, useGlass] = createContext('Glass', { default: false })
 *
 *   // Optional, undefined outside a provider:
 *   export const [AlertProvider, useAlert] =
 *     createContext<AlertContext | undefined>('Alert', { default: undefined })
 */
export function createContext<T>(name: string): [Provider<T>, () => T]
export function createContext<T>(name: string, options: Options<T>): [Provider<T>, () => T]
export function createContext<T>(name: string, options?: Options<T>): [Provider<T>, () => T] {
	const hasDefault = options !== undefined

	const Context = reactCreateContext<T>(hasDefault ? options.default : (MISSING as unknown as T))

	function useContextValue(): T {
		const value = useContext(Context)

		if (!hasDefault && (value as unknown) === MISSING) {
			throw new Error(`use${name} must be used within <${name}>`)
		}

		return value
	}

	return [Context.Provider as unknown as Provider<T>, useContextValue]
}
