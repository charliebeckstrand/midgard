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
	 * events originating inside form fields and contenteditable elements;
	 * pass `() => false` to fire regardless of focus (e.g. ⌘K openers).
	 */
	ignore?: KeybindingFilter
}

/**
 * Subscribe to tinykeys keybindings for the lifetime of the component.
 * Reads handlers fresh on each event; the bindings map closes over changing
 * state without re-subscribing.
 *
 * @param bindings - tinykeys map of key/chord pattern (e.g. `'$mod+k'`) to
 * handler. Only the set of keys is tracked for re-subscription; handler
 * identity may change freely between renders.
 * @remarks SSR-safe: the subscription effect no-ops when `window` is absent.
 */
export function useKeybindings(bindings: KeybindingsMap, options: KeybindingsOptions = {}): void {
	const { enabled = true, target, event, capture, timeout, ignore } = options

	const bindingsRef = useRef(bindings)

	bindingsRef.current = bindings

	// A ref holds `ignore`; the effect forwards a stable ref-reading wrapper
	// when provided, `undefined` when omitted. Presence is the dep, not identity.
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
