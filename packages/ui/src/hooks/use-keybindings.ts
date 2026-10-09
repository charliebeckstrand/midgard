'use client'

import { useEffect, useEffectEvent, useMemo } from 'react'
import { type KeybindingFilter, type KeybindingsMap, tinykeys } from 'tinykeys'

/** Options for {@link useKeybindings}: the enable gate, the target, the capture phase, and the skip predicate. */
export type KeybindingsOptions = {
	/** Disable without unmounting. @defaultValue true */
	enabled?: boolean
	/** Listener target. @defaultValue window */
	target?: Window | HTMLElement
	/**
	 * Listen in the capture phase, so a descendant that handles the key and stops
	 * its propagation (a focused grid or editor) cannot swallow the chord first.
	 * @defaultValue false
	 */
	capture?: boolean
	/**
	 * Predicate that returns true to skip an event. It replaces the tinykeys
	 * default, which skips auto-repeat events, events during IME composition, and
	 * events from form fields and contenteditable elements. To fire regardless of
	 * focus, for a key that a form field never uses, pass
	 * `(e) => e.repeat || isComposing(e)`. This keeps the repeat and composition
	 * guards. Use the `isComposing` utility, because Safari leaves `e.isComposing`
	 * false on some keys that an IME takes. Do not pass `() => false`: a held key then fires on each auto-repeat.
	 * To extend the default, call `defaultKeybindingsHandlerIgnore` from tinykeys
	 * in the predicate, as `CommandPalette` does.
	 *
	 * @example
	 * ```ts
	 * useKeybindings({ Escape: close }, { ignore: (e) => e.repeat || isComposing(e) })
	 * ```
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
	const { enabled = true, target, capture, ignore } = options

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

		return tinykeys(resolvedTarget, wrapped, { capture, ignore: resolvedIgnore })
	}, [enabled, target, capture, hasIgnore, keySignature])
}
