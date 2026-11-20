'use client'

import type { LucideIcon, LucideProps } from 'lucide-react'
import { cloneElement, type ReactElement, use } from 'react'
import { cn } from '../../core/cn'
import { IconsContext } from './context'
import type { IconName } from './types'

/**
 * A glyph of ui: it draws the icon that the app registers for its name, or its
 * Lucide default.
 *
 * @internal
 */
export type IconGlyph = ((props: LucideProps) => ReactElement) & { displayName: string }

/**
 * Makes the glyph of ui for one Lucide icon. The glyph reads the icon that
 * `<UIProvider icons>` registers for the own name of `fallback`, which is its
 * `displayName`. With no registered icon, it draws `fallback`, the Lucide
 * default.
 *
 * A registered icon gets the props of the glyph. Its own `className` comes
 * first, so a class of the call site wins a conflict, and its own `style`
 * merges under the style of the call site.
 *
 * @param fallback - The Lucide icon that draws the glyph by default.
 * @internal
 */
export function createIcon(fallback: LucideIcon): IconGlyph {
	const Fallback = fallback

	// Lucide names each icon by its own name, the key of `Icons`. A test checks
	// that each export of `icons.ts` has that name.
	const name = fallback.displayName as IconName

	function Glyph(props: LucideProps): ReactElement {
		const icon = use(IconsContext)[name]

		if (icon === undefined) return <Fallback {...props} />

		return cloneElement(icon, {
			...props,
			className: cn(icon.props.className, props.className),
			style: icon.props.style || props.style ? { ...icon.props.style, ...props.style } : undefined,
		})
	}

	Glyph.displayName = name

	return Glyph
}
