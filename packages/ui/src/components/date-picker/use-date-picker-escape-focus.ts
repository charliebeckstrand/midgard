'use client'

import type { FloatingRootContext, OpenChangeReason } from '@floating-ui/react'
import { type RefObject, useEffect } from 'react'

/**
 * Synchronously restore focus to the trigger when the panel closes via Escape.
 *
 * `FloatingFocusManager` defers `returnFocus` to its unmount cleanup, which
 * `AnimatePresence` postpones until the exit animation finishes. Without this,
 * focus sits on the fading calendar element and only snaps back to the trigger
 * after the close completes. Hooking into floating-ui's `escape-key` openchange
 * event moves focus before the transition runs, so the trigger holds focus
 * throughout — leaving the manager's later cleanup as a no-op refocus.
 */
export function useDatePickerEscapeFocus(
	context: FloatingRootContext,
	triggerRef: RefObject<HTMLButtonElement | null>,
) {
	useEffect(() => {
		function handleOpenChange({ open, reason }: { open: boolean; reason?: OpenChangeReason }) {
			if (open || reason !== 'escape-key') return

			triggerRef.current?.focus()
		}

		context.events.on('openchange', handleOpenChange)

		return () => context.events.off('openchange', handleOpenChange)
	}, [context, triggerRef])
}
