'use client'

import { type Context as ReactContext, createContext as reactCreateContext, use } from 'react'

const MISSING = Symbol('createContext.missing')

type DefaultOption<T> = { default: T }
type ErrorOption = { error: string }

type Options<T> = DefaultOption<T> | ErrorOption

/**
 * Creates a typed context and its consumer hook. The Context itself is the
 * Provider — render `<MyContext value={…}>` directly (React 19).
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
 * For thin cases where a named hook would be empty sugar, discard the hook
 * and let consumers `use(Context)` directly.
 *
 * @example
 *   // Required:
 *   export const [TabsContext, useTabs] = createContext<TabsContextValue>('Tabs')
 *
 *   // Optional with a value default:
 *   export const [GlassContext, useGlass] = createContext('Glass', { default: false })
 *
 *   // Required with a custom error:
 *   export const [PanelCloseContext, usePanelCloseContext] =
 *     createContext<PanelCloseContextValue>('PanelClose', {
 *       error: 'PanelClose must be rendered inside a Dialog, Sheet, or Drawer',
 *     })
 *
 *   // Thin: skip the hook, consumers use(Context) directly:
 *   const [OffcanvasContext] =
 *     createContext<OffcanvasContextValue | null>('Offcanvas', { default: null })
 */
export function createContext<T>(name: string): [ReactContext<T>, () => T]
export function createContext<T>(
	name: string,
	options: DefaultOption<T>,
): [ReactContext<T>, () => T]
export function createContext<T>(name: string, options: ErrorOption): [ReactContext<T>, () => T]
export function createContext<T>(name: string, options?: Options<T>): [ReactContext<T>, () => T] {
	const hasDefault = options !== undefined && 'default' in options

	const customError = options !== undefined && 'error' in options ? options.error : undefined

	const Context = reactCreateContext<T>(
		hasDefault ? (options as DefaultOption<T>).default : (MISSING as unknown as T),
	)

	// Name the context so it shows as `<${name}>` in React DevTools rather
	// than an anonymous provider — the only way to tell same-shaped contexts
	// apart (e.g. the Density token vs the friendly Density level).
	Context.displayName = name

	function useContextValue(): T {
		const value = use(Context)

		if (!hasDefault && (value as unknown) === MISSING) {
			throw new Error(customError ?? `use${name} must be used within <${name}>`)
		}

		return value
	}

	return [Context, useContextValue]
}
