'use client'

import {
	type Provider,
	type Context as ReactContext,
	createContext as reactCreateContext,
	useContext,
} from 'react'

const MISSING = Symbol('createContext.missing')

type DefaultOption<T> = { default: T }
type ErrorOption = { error: string }

type Options<T> = DefaultOption<T> | ErrorOption

/**
 * Creates a typed context with a Provider, a consumer hook, and the raw Context.
 *
 * - Without options, the hook throws `use${name} must be used within <${name}>`
 *   when used outside a provider — for required context (Menu, Tabs, Dialog, etc.).
 * - With `{ default }`, the hook returns the default when used outside a
 *   provider — for optional / ambient context (Glass, Skeleton, Headless,
 *   Density, Control, etc.).
 * - With `{ error }`, the hook still throws when used outside a provider, with
 *   the supplied message instead of the default template — for the rare case
 *   where the consumer name (e.g. `PanelClose`) differs from the wrapper the
 *   developer needs to add (`Dialog` / `Sheet` / `Drawer`).
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
 *   // Required with a custom error:
 *   export const [PanelCloseProvider, usePanelCloseContext] =
 *     createContext<PanelCloseContextValue>('PanelClose', {
 *       error: 'PanelClose must be rendered inside a Dialog, Sheet, or Drawer',
 *     })
 *
 *   // Thin: skip the hook, consumers use(Context) directly:
 *   const [OffcanvasProvider, , OffcanvasContext] =
 *     createContext<OffcanvasValue | null>('Offcanvas', { default: null })
 */
export function createContext<T>(name: string): [Provider<T>, () => T, ReactContext<T>]
export function createContext<T>(
	name: string,
	options: DefaultOption<T>,
): [Provider<T>, () => T, ReactContext<T>]
export function createContext<T>(
	name: string,
	options: ErrorOption,
): [Provider<T>, () => T, ReactContext<T>]
export function createContext<T>(
	name: string,
	options?: Options<T>,
): [Provider<T>, () => T, ReactContext<T>] {
	const hasDefault = options !== undefined && 'default' in options

	const customError = options !== undefined && 'error' in options ? options.error : undefined

	const Context = reactCreateContext<T>(
		hasDefault ? (options as DefaultOption<T>).default : (MISSING as unknown as T),
	)

	function useContextValue(): T {
		const value = useContext(Context)

		if (!hasDefault && (value as unknown) === MISSING) {
			throw new Error(customError ?? `use${name} must be used within <${name}>`)
		}

		return value
	}

	return [Context.Provider, useContextValue, Context]
}
