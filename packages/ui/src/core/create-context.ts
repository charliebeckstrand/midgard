'use client'

import {
	type Provider,
	type Context as ReactContext,
	createContext as reactCreateContext,
	useContext,
} from 'react'

const MISSING = Symbol('createContext.missing')

type Options<T> = {
	/** Returned by the hook when consumed outside a provider. */
	default: T
}

/**
 * Creates a typed context with a Provider, a consumer hook, and the raw Context.
 *
 * - Without options, the hook throws when used outside a provider — for
 *   required context (Menu, Tabs, Dialog, etc.).
 * - With `{ default }`, the hook returns the default when used outside a
 *   provider — for optional / ambient context (Glass, Skeleton, Concentric,
 *   Control, etc.).
 *
 * The third tuple element is the raw React Context, for thin cases where a
 * named hook would be empty sugar — consumers can `use(Context)` directly.
 *
 * @example
 *   // Required:
 *   export const [TabsProvider, useTabs] = createContext<TabsContext>('Tabs')
 *
 *   // Optional with a value default:
 *   export const [GlassProvider, useGlass] = createContext('Glass', { default: false })
 *
 *   // Thin: skip the hook, consumers use(Context) directly:
 *   const [OffcanvasProvider, , OffcanvasContext] =
 *     createContext<OffcanvasValue | null>('Offcanvas', { default: null })
 */
export function createContext<T>(name: string): [Provider<T>, () => T, ReactContext<T>]
export function createContext<T>(
	name: string,
	options: Options<T>,
): [Provider<T>, () => T, ReactContext<T>]
export function createContext<T>(
	name: string,
	options?: Options<T>,
): [Provider<T>, () => T, ReactContext<T>] {
	const hasDefault = options !== undefined

	const Context = reactCreateContext<T>(hasDefault ? options.default : (MISSING as unknown as T))

	function useContextValue(): T {
		const value = useContext(Context)

		if (!hasDefault && (value as unknown) === MISSING) {
			throw new Error(`use${name} must be used within <${name}>`)
		}

		return value
	}

	return [Context.Provider, useContextValue, Context]
}
