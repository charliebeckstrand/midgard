'use client'

import { useMemo } from 'react'
import { cn } from '../../core'

export type A11yLiveLevel = 'polite' | 'assertive'

export type A11yLiveRegionOptions = {
	/** Announcement urgency. `'assertive'` interrupts; `'polite'` waits. */
	level?: A11yLiveLevel
	/** Read the region as a whole on change rather than only the diff. */
	atomic?: boolean
	/** Visually hide the region (`sr-only`) while keeping it in the a11y tree. */
	srOnly?: boolean
	/** Extra classes merged after the visibility class. */
	className?: string
}

export type A11yLiveRegionProps = {
	role: 'status' | 'alert'
	'aria-live': A11yLiveLevel
	'aria-atomic': boolean
	className?: string
}

/**
 * Props for a live region the consumer fills with children: a status/alert
 * landmark with matching `aria-live` / `aria-atomic`, optionally visually
 * hidden. For imperative, no-visible-home announcements use `announce` /
 * `useA11yAnnouncements` instead.
 *
 * @returns An `A11yLiveRegionProps` bag to spread onto the region element:
 * `role` (`'status'` polite / `'alert'` assertive), `aria-live`, `aria-atomic`,
 * and `className` (the `sr-only` class merged with any passed `className`, or
 * undefined).
 * @see {@link useA11yAnnouncements}
 */
export function useA11yLiveRegion({
	level = 'polite',
	atomic = true,
	srOnly = false,
	className,
}: A11yLiveRegionOptions = {}): A11yLiveRegionProps {
	return useMemo(
		() => ({
			role: level === 'assertive' ? 'alert' : 'status',
			'aria-live': level,
			'aria-atomic': atomic,
			className: cn(srOnly && 'sr-only', className) || undefined,
		}),
		[level, atomic, srOnly, className],
	)
}
