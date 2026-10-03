import { useSyncExternalStore } from 'react'
import { createEmitter } from '../../../utilities'

/** The `localStorage` key of the list of the tools that are on. */
export const DEBUG_KEY = 'docs-debug'

/**
 * The attribute of the root element that lists the tools that are on,
 * separated by spaces. `DebugScript` sets it before the first paint, and
 * CSS shows the header button of each tool that it lists.
 */
export const DEBUG_ATTRIBUTE = 'data-debug'

const change = createEmitter()

function read(): readonly string[] {
	try {
		const stored: unknown = JSON.parse(localStorage.getItem(DEBUG_KEY) ?? '[]')

		return Array.isArray(stored) ? stored.filter((id) => typeof id === 'string') : []
	} catch {
		// Storage access can throw (cookies off), and the value can be bad JSON.
		// All tools are then off.
		return []
	}
}

/** The ids of the tools that are on. It is a new array after each change, so a render reads a change. */
let enabled = read()

/** Returns the ids of the tools that are on, outside a render. */
export function readDebugTools(): readonly string[] {
	return enabled
}

/**
 * Turns the tool `id` on or off, and stores the list. A tool that is on stays
 * on after a reload, so it starts with the page.
 */
export function setDebugTool(id: string, on: boolean) {
	enabled = on
		? [...enabled.filter((other) => other !== id), id]
		: enabled.filter((other) => other !== id)

	try {
		localStorage.setItem(DEBUG_KEY, JSON.stringify(enabled))
	} catch {
		// The change then applies for the life of the page only.
	}

	if (enabled.length > 0) document.documentElement.setAttribute(DEBUG_ATTRIBUTE, enabled.join(' '))
	else document.documentElement.removeAttribute(DEBUG_ATTRIBUTE)

	change.emit()
}

const NONE: readonly string[] = []

/**
 * Returns the ids of the tools that are on, and renders again when the list
 * changes. The HTML that the build renders has all tools off. Thus the sheets
 * of the tools that are on mount after hydration, but CSS shows their header
 * buttons at the first paint ({@link DEBUG_ATTRIBUTE}).
 */
export function useDebugTools() {
	return useSyncExternalStore(
		change.subscribe,
		() => enabled,
		() => NONE,
	)
}
