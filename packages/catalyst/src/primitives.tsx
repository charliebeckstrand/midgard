'use client'

import React, { forwardRef, useCallback, useRef } from 'react'

function setAttr(el: HTMLElement, name: string) {
	el.setAttribute(`data-${name}`, '')
}

function removeAttr(el: HTMLElement, name: string) {
	el.removeAttribute(`data-${name}`)
}

/**
 * Returns event handlers that manage data-hover, data-active, and data-focus
 * attributes on the target element. These replace HeadlessUI's automatic
 * data attribute management.
 */
export function useInteractiveHandlers() {
	return {
		onMouseEnter: (e: React.MouseEvent<HTMLElement>) => setAttr(e.currentTarget, 'hover'),
		onMouseLeave: (e: React.MouseEvent<HTMLElement>) => {
			removeAttr(e.currentTarget, 'hover')
			removeAttr(e.currentTarget, 'active')
		},
		onMouseDown: (e: React.MouseEvent<HTMLElement>) => setAttr(e.currentTarget, 'active'),
		onMouseUp: (e: React.MouseEvent<HTMLElement>) => removeAttr(e.currentTarget, 'active'),
		onFocus: (e: React.FocusEvent<HTMLElement>) => setAttr(e.currentTarget, 'focus'),
		onBlur: (e: React.FocusEvent<HTMLElement>) => removeAttr(e.currentTarget, 'focus'),
	}
}

/**
 * Merges multiple event handlers for the same event into a single handler.
 */
function mergeHandlers<E>(
	...handlers: (((e: E) => void) | undefined)[]
): ((e: E) => void) | undefined {
	return (e: E) => {
		for (const handler of handlers) {
			handler?.(e)
		}
	}
}

type InteractiveButtonProps = Omit<React.ComponentPropsWithRef<'button'>, 'ref'>

/**
 * A button that manages data-hover, data-active, data-focus, and data-disabled
 * attributes via DOM event handlers. Drop-in replacement for HeadlessUI's Button.
 */
export const InteractiveButton = forwardRef<HTMLButtonElement, InteractiveButtonProps>(
	function InteractiveButton({ disabled, onMouseEnter, onMouseLeave, onMouseDown, onMouseUp, onFocus, onBlur, ...props }, ref) {
		const interactive = useInteractiveHandlers()

		return (
			<button
				type="button"
				{...props}
				ref={ref}
				disabled={disabled}
				data-disabled={disabled ? '' : undefined}
				onMouseEnter={mergeHandlers(interactive.onMouseEnter, onMouseEnter)}
				onMouseLeave={mergeHandlers(interactive.onMouseLeave, onMouseLeave)}
				onMouseDown={mergeHandlers(interactive.onMouseDown, onMouseDown)}
				onMouseUp={mergeHandlers(interactive.onMouseUp, onMouseUp)}
				onFocus={mergeHandlers(interactive.onFocus, onFocus)}
				onBlur={mergeHandlers(interactive.onBlur, onBlur)}
			/>
		)
	},
)

type InteractiveLinkProps = React.ComponentPropsWithRef<'a'> & {
	href: string
}

/**
 * An interactive link that manages data-hover, data-active, and data-focus
 * attributes. Used for Link components that need interactive styling.
 */
export const InteractiveLink = forwardRef<HTMLAnchorElement, InteractiveLinkProps>(
	function InteractiveLink({ onMouseEnter, onMouseLeave, onMouseDown, onMouseUp, onFocus, onBlur, ...props }, ref) {
		const interactive = useInteractiveHandlers()

		return (
			<a
				{...props}
				ref={ref}
				onMouseEnter={mergeHandlers(interactive.onMouseEnter, onMouseEnter)}
				onMouseLeave={mergeHandlers(interactive.onMouseLeave, onMouseLeave)}
				onMouseDown={mergeHandlers(interactive.onMouseDown, onMouseDown)}
				onMouseUp={mergeHandlers(interactive.onMouseUp, onMouseUp)}
				onFocus={mergeHandlers(interactive.onFocus, onFocus)}
				onBlur={mergeHandlers(interactive.onBlur, onBlur)}
			/>
		)
	},
)

/**
 * Hook for managing click-outside detection. Returns a ref to attach to
 * the container element that should be "inside".
 */
export function useClickOutside(onClose: () => void) {
	const containerRef = useRef<HTMLDivElement>(null)

	const handler = useCallback(
		(e: MouseEvent) => {
			if (containerRef.current && !containerRef.current.contains(e.target as Node)) {
				onClose()
			}
		},
		[onClose],
	)

	const attach = useCallback(() => {
		document.addEventListener('pointerdown', handler)
		return () => document.removeEventListener('pointerdown', handler)
	}, [handler])

	return { containerRef, attach }
}

/**
 * Hook for managing escape key press to close overlays.
 */
export function useEscapeKey(onClose: () => void) {
	return useCallback(() => {
		function handler(e: KeyboardEvent) {
			if (e.key === 'Escape') onClose()
		}

		document.addEventListener('keydown', handler)
		return () => document.removeEventListener('keydown', handler)
	}, [onClose])
}
