'use client'

import { useEffect, useMemo, useRef } from 'react'
import { type KeybindingFilter, type KeybindingsMap, tinykeys } from 'tinykeys'

type UseKeybindingsOptions = {
	/** Disable without unmounting. @default true */
	enabled?: boolean
	/** Listener target. @default window */
	target?: Window | HTMLElement
	/** @default 'keydown' */
	event?: 'keydown' | 'keyup'
	/** @default false */
	capture?: boolean
	/** Chord timeout in ms between presses in a sequence. @default 1000 */
	timeout?: number
	/**
	 * Predicate that returns true to skip an event. tinykeys' default skips
	 * events originating inside form fields and contenteditable elements —
	 * pass `() => false` to fire regardless of focus (e.g. ⌘K openers).
	 */
	ignore?: KeybindingFilter
}

/**
 * Subscribe to tinykeys keybindings for the lifetime of the component.
 * Handlers are read fresh on each event, so the bindings map can close over
 * changing state without re-subscribing.
 */
export function useKeybindings(
	bindings: KeybindingsMap,
	options: UseKeybindingsOptions = {},
): void {
	const { enabled = true, target, event, capture, timeout, ignore } = options

	const bindingsRef = useRef(bindings)

	bindingsRef.current = bindings

	// Hold `ignore` in a ref so an inline filter doesn't re-subscribe the global
	// listener every render. Its presence (not identity) is the only dep that
	// matters: when omitted we pass `undefined` to preserve tinykeys' default
	// (skip form fields); when provided we forward a stable ref-reading wrapper.
	const ignoreRef = useRef(ignore)

	ignoreRef.current = ignore

	const hasIgnore = ignore !== undefined

	const keySignature = useMemo(() => Object.keys(bindings).sort().join('\x00'), [bindings])

	useEffect(() => {
		if (!enabled) return

		if (typeof window === 'undefined') return

		const resolvedTarget = target ?? window

		const keys = keySignature ? keySignature.split('\x00') : []

		if (keys.length === 0) return

		const wrapped: KeybindingsMap = {}

		for (const key of keys) {
			wrapped[key] = (e) => bindingsRef.current[key]?.(e)
		}

		const resolvedIgnore: KeybindingFilter | undefined = hasIgnore
			? (e) => ignoreRef.current?.(e) ?? false
			: undefined

		return tinykeys(resolvedTarget, wrapped, { event, capture, timeout, ignore: resolvedIgnore })
	}, [enabled, target, event, capture, timeout, hasIgnore, keySignature])
}
