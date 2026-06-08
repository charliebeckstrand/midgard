'use client'

import { useEffect, useMemo, useRef } from 'react'
import { type KeybindingFilter, type KeybindingsMap, tinykeys } from 'tinykeys'

type KeybindingsOptions = {
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
export function useKeybindings(bindings: KeybindingsMap, options: KeybindingsOptions = {}): void {
	const { enabled = true, target, event, capture, timeout, ignore } = options

	const bindingsRef = useRef(bindings)

	bindingsRef.current = bindings

	// `ignore` is held in a ref; a stable ref-reading wrapper is forwarded when
	// provided, and `undefined` when omitted — presence is the only dep, not identity.
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
