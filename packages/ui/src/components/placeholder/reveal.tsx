'use client'

import type React from 'react'
import { ContentReveal } from '../../primitives/content-reveal'
import { PlaceholderText } from './component'

export type PlaceholderRevealProps = {
	/** Shows children when true, placeholder bars when false */
	ready: boolean
	/** Number of placeholder bars (default 3) */
	bars?: number
	/** Optional className for the container */
	className?: string
	/** Real content revealed when ready */
	children: React.ReactNode
	/**
	 * Animation mode:
	 * - `crossfade` (default) — placeholder and content overlap, dimensions stay stable
	 * - `wait` — placeholder exits fully before content enters
	 */
	mode?: 'crossfade' | 'wait'
}

/**
 * Convenience wrapper that pairs `PlaceholderText` bars with `ContentReveal`.
 * For custom placeholder layouts, use `ContentReveal` directly with a
 * hand-composed placeholder that mirrors the content's shape.
 */
export function PlaceholderReveal({
	ready,
	bars = 3,
	className,
	children,
	mode,
}: PlaceholderRevealProps) {
	return (
		<ContentReveal
			ready={ready}
			placeholder={<PlaceholderText bars={bars} />}
			className={className}
			mode={mode}
		>
			{children}
		</ContentReveal>
	)
}
