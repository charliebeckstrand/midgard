'use client'

import { useEffect, useEffectEvent, useMemo } from 'react'
import { type KeybindingFilter, type KeybindingsMap, tinykeys } from 'tinykeys'

/** Options for {@link useKeybindings}: the bindings to match and the enable gate. */
export type KeybindingsOptions = {
	/** Disable without unmounting. @defaultValue true */
	enabled?: boolean
	/** Listener target. @defaultValue window */
	target?: Window | HTMLElement
	/**
	 * Predicate that returns true to skip an event. The tinykeys default skips
	 * events originating inside form fields and contenteditable elements; pass
	 * `() => false` to fire regardless of focus (e.g. ⌘K openers).
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
 * identity can change freely between renders.
 * @remarks SSR-safe: the subscription lives in an effect, which never runs on the server.
 */
export function useKeybindings(bindings: KeybindingsMap, options: KeybindingsOptions = {}): void {
	const { enabled = true, target, ignore } = options

	// Effect events read the newest bindings and `ignore` when a key fires, so a
	// new identity of either never re-subscribes. For `ignore`, presence is the
	// dep, not identity.
	const handle = useEffectEvent((key: string, event: KeyboardEvent) => bindings[key]?.(event))

	const skip = useEffectEvent((event: KeyboardEvent) => ignore?.(event) ?? false)

	const hasIgnore = ignore !== undefined

	const keySignature = useMemo(() => Object.keys(bindings).sort().join('\x00'), [bindings])

	useEffect(() => {
		if (!enabled) return

		const resolvedTarget = target ?? window

		const keys = keySignature ? keySignature.split('\x00') : []

		if (keys.length === 0) return

		const wrapped: KeybindingsMap = Object.fromEntries(
			keys.map((key) => [key, (e: KeyboardEvent) => handle(key, e)]),
		)

		const resolvedIgnore: KeybindingFilter | undefined = hasIgnore ? (e) => skip(e) : undefined

		return tinykeys(resolvedTarget, wrapped, { ignore: resolvedIgnore })
	}, [enabled, target, hasIgnore, keySignature])
}
