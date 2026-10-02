import { useSyncExternalStore } from 'react'
import { createEmitter } from '../../../utilities'

/** The `localStorage` key of the list of the tools that are on. */
const KEY = 'docs-debug'

const change = createEmitter()

function read(): readonly string[] {
	try {
		const stored: unknown = JSON.parse(localStorage.getItem(KEY) ?? '[]')

		return Array.isArray(stored) ? stored.filter((id) => typeof id === 'string') : []
	} catch {
		// Storage access can throw (cookies off), and the value can be bad JSON.
		// All tools are then off.
		return []
	}
}

/** The ids of the tools that are on. It is a new array after each change, so a render reads a change. */
let enabled = read()

/**
 * Turns the tool `id` on or off, and stores the list. A tool that is on stays
 * on after a reload, so it starts with the page.
 */
export function setDebugTool(id: string, on: boolean) {
	enabled = on
		? [...enabled.filter((other) => other !== id), id]
		: enabled.filter((other) => other !== id)

	try {
		localStorage.setItem(KEY, JSON.stringify(enabled))
	} catch {
		// The change then applies for the life of the page only.
	}

	change.emit()
}

/** Returns the ids of the tools that are on, and renders again when the list changes. */
export function useDebugTools() {
	return useSyncExternalStore(change.subscribe, () => enabled)
}
