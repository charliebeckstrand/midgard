'use client'

import { type Context as ReactContext, createContext as reactCreateContext, use } from 'react'

const MISSING = Symbol('createContext.missing')

type Options<T> = { default: T } | { error: string }

/**
 * Creates a typed context and its consumer hook. The Context itself is the
 * Provider; render `<MyContext value={…}>` directly (React 19).
 *
 * - Without options, the hook throws `use${name} must be used within <${name}>`
 *   when used outside a provider. That is for required context, such as Menu,
 *   Tabs, or Dialog.
 * - With `{ default }`, the hook returns the default when used outside a
 *   provider; for optional / ambient context (Glass, Skeleton, Headless,
 *   Density, Control, etc.).
 * - With `{ error }`, the hook still throws when used outside a provider, with
 *   the supplied message instead of the default template. That covers the case
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
export function createContext<T>(name: string, options?: Options<T>): [ReactContext<T>, () => T] {
	// The symbol is private to this module, so only a missing provider gives it.
	const Context = reactCreateContext<T>(
		options && 'default' in options ? options.default : (MISSING as never),
	)

	// React DevTools shows the context as `<${name}>`.
	Context.displayName = name

	function useContextValue(): T {
		const value = use(Context)

		if (value === MISSING) {
			throw new Error(
				options && 'error' in options ? options.error : `use${name} must be used within <${name}>`,
			)
		}

		return value
	}

	return [Context, useContextValue]
}
