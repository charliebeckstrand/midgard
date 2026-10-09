'use client'

import { useCallback, useEffect, useRef } from 'react'
import { useStableEvent } from '../../hooks/use-stable-event'
import { preloadTooltipBody } from './tooltip-body-loader'
import { isReferenceDisabled, observeReferenceDisabled } from './tooltip-reference-disabled'

/**
 * The intent that a reader showed on a trigger before the tooltip state
 * loaded. `useTooltipState` replays it when it takes over the trigger, so the
 * first hover, focus, or click opens the tooltip as it does after the load.
 * @internal
 */
export type TooltipIntent = {
	/** A mouse or pen hover that is still on the trigger, and the time that it started. */
	hover: { at: number; event: MouseEvent } | null
	/** A keyboard focus that is still on the trigger. */
	focus: FocusEvent | null
	/** The click that opened a `trigger="click"` tooltip, until a second click closes it. */
	click: MouseEvent | null
	/** The trigger turned enabled under the pointer, which opens the tooltip at once. */
	reenabled: boolean
}

/** The options that the listeners read at the time of each event. */
type IntentOptions = { enabled: boolean; trigger: 'hover' | 'click' }

/** The pointer types that a hover trigger takes, as the `mouseOnly` option of `useHover` reads them. */
const MOUSE_LIKE = new Set(['mouse', 'pen', ''])

/** The nodes that take a typed key, as `isTypeableElement` of Floating UI reads them. */
const TYPEABLE =
	'input:not([type="hidden"]):not([disabled]),[contenteditable]:not([contenteditable="false"]),textarea:not([disabled])'

function createIntent(): TooltipIntent {
	return { hover: null, focus: null, click: null, reenabled: false }
}

function clearIntent(intent: TooltipIntent): void {
	intent.hover = null
	intent.focus = null
	intent.click = null
	intent.reenabled = false
}

/**
 * Whether the browser is Safari on a Mac. Safari there does not match
 * `:focus-visible` for a focus that comes from outside the document, so the
 * focus gate reads the last input instead, as `useFocus` of Floating UI does.
 */
function isMacSafari(): boolean {
	const platform =
		(navigator as { userAgentData?: { platform?: string } }).userAgentData?.platform ??
		navigator.platform

	return (
		platform.toLowerCase().startsWith('mac') &&
		!navigator.maxTouchPoints &&
		/apple/i.test(navigator.vendor)
	)
}

/** Whether the last input on a Mac Safari page was a key press, not a pointer press. */
let keyboardModality = true

let modalityTracked = false

function trackModality(): void {
	if (modalityTracked || !isMacSafari()) return

	modalityTracked = true

	window.addEventListener(
		'keydown',
		() => {
			keyboardModality = true
		},
		true,
	)

	window.addEventListener(
		'pointerdown',
		() => {
			keyboardModality = false
		},
		true,
	)
}

/**
 * Whether a focus opens the tooltip. The gate is the `visibleOnly` gate of
 * `useFocus`: a keyboard focus opens it, and the focus that a tap or a click
 * gives a button does not.
 */
function focusOpens(event: FocusEvent): boolean {
	const target = event.target

	if (!(target instanceof Element)) return true

	if (isMacSafari() && !event.relatedTarget) return keyboardModality || target.matches(TYPEABLE)

	try {
		return target.matches(':focus-visible')
	} catch {
		return true
	}
}

/**
 * Adds the native listeners of a trigger that has no tooltip state yet. Each
 * listener starts the load of the state module and records the intent that
 * the state replays. The listeners keep the gates of the interaction hooks of
 * Floating UI, so they record only an intent that would open the tooltip.
 *
 * @returns A function that removes the listeners.
 */
function listenForIntent(
	node: HTMLElement,
	intent: TooltipIntent,
	readOptions: () => IntentOptions,
): () => void {
	const doc = node.ownerDocument

	const win = doc.defaultView ?? window

	// As the `blockFocusRef` of `useFocus`: a trigger that has focus when the
	// window loses focus does not open when the window gets focus again.
	let blockFocus = false

	let disabled = isReferenceDisabled(node)

	const pending = () => intent.hover !== null || intent.focus !== null || intent.click !== null

	const onPointerEnter = (event: PointerEvent) => {
		preloadTooltipBody()

		const { enabled, trigger } = readOptions()

		if (!enabled || trigger !== 'hover' || !MOUSE_LIKE.has(event.pointerType)) return

		intent.hover = {
			at: performance.now(),
			event: new MouseEvent('mouseenter', { clientX: event.clientX, clientY: event.clientY }),
		}
	}

	const onPointerLeave = () => {
		intent.hover = null

		blockFocus = false
	}

	const onFocusIn = (event: FocusEvent) => {
		preloadTooltipBody()

		if (!readOptions().enabled || blockFocus || !focusOpens(event)) return

		intent.focus = event
	}

	const onFocusOut = () => {
		blockFocus = false

		// As `useFocus`, after the window blur: focus that leaves the page keeps
		// the tooltip, and focus that leaves the trigger closes it.
		win.setTimeout(() => {
			if (node.contains(doc.activeElement)) return

			intent.focus = null

			intent.click = null
		})
	}

	const onClick = (event: MouseEvent) => {
		preloadTooltipBody()

		const { enabled, trigger } = readOptions()

		if (!enabled || trigger !== 'click') return

		// As `useClick` with `stickIfOpen`: a second click closes only a tooltip
		// that a click opened. A click on a tooltip that focus opened keeps it.
		if (intent.click) clearIntent(intent)
		else intent.click = event
	}

	const onWindowBlur = () => {
		if (!pending() && node === doc.activeElement) blockFocus = true
	}

	const stopObserver = observeReferenceDisabled(node, () => {
		const next = isReferenceDisabled(node)

		if (disabled && !next && node.matches(':hover')) {
			intent.reenabled = true

			preloadTooltipBody()
		}

		disabled = next
	})

	trackModality()

	node.addEventListener('pointerenter', onPointerEnter)
	node.addEventListener('pointerleave', onPointerLeave)
	node.addEventListener('focusin', onFocusIn)
	node.addEventListener('focusout', onFocusOut)
	node.addEventListener('click', onClick)
	win.addEventListener('blur', onWindowBlur)

	return () => {
		stopObserver()

		node.removeEventListener('pointerenter', onPointerEnter)
		node.removeEventListener('pointerleave', onPointerLeave)
		node.removeEventListener('focusin', onFocusIn)
		node.removeEventListener('focusout', onFocusOut)
		node.removeEventListener('click', onClick)
		win.removeEventListener('blur', onWindowBlur)
	}
}

/**
 * The first state of a {@link Tooltip} trigger, before the module of the
 * tooltip state loads. It holds no Floating UI. Native listeners on the
 * trigger start the load on a hover, a focus, or a click, and record the
 * intent. `useTooltipState` takes the intent when it takes over the trigger.
 *
 * @returns `setReference`, which the trigger calls with its node, and
 * `takeIntent`, which removes the listeners and gives the recorded intent.
 * @internal
 */
export function useTooltipIntent(options: IntentOptions) {
	// The listeners read the newest options when an event comes.
	const readOptions = useStableEvent(() => options)

	const intentRef = useRef<TooltipIntent>(createIntent())

	const stopRef = useRef<(() => void) | null>(null)

	const setReference = useCallback(
		(node: HTMLElement | null) => {
			stopRef.current?.()

			stopRef.current = null

			clearIntent(intentRef.current)

			if (node) stopRef.current = listenForIntent(node, intentRef.current, readOptions)
		},
		[readOptions],
	)

	const takeIntent = useCallback((): TooltipIntent => {
		stopRef.current?.()

		stopRef.current = null

		const intent = { ...intentRef.current }

		clearIntent(intentRef.current)

		return intent
	}, [])

	// A tooltip that turns off forgets the intent, as it closes an open one.
	useEffect(() => {
		if (!options.enabled) clearIntent(intentRef.current)
	}, [options.enabled])

	useEffect(
		() => () => {
			stopRef.current?.()
		},
		[],
	)

	return { setReference, takeIntent }
}
