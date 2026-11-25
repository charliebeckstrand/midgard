'use client'

import type { LucideProps } from 'lucide-react'
import { cloneElement, type ReactElement, use } from 'react'
import { cn } from '../../core/cn'
import { IconsContext } from './context'
import type { IconName } from './types'

/** Props for {@link GlyphSlot}: the icon `name`, its Lucide default as `children`, and the props of the glyph. */
type GlyphSlotProps = Omit<LucideProps, 'name'> & { name: IconName; children: ReactElement }

/**
 * The client part of {@link Glyph}. It draws the icon that
 * `<UIProvider icons>` registers for `name`, or its `children`, the Lucide
 * default.
 *
 * A registered icon gets the props of the glyph. Its own `className` comes
 * first, so a class of the call site wins a conflict, and its own `style`
 * merges under the style of the call site.
 *
 * @internal
 */
export function GlyphSlot({ name, children, ...props }: GlyphSlotProps): ReactElement {
	const icon = use(IconsContext)[name]

	if (icon === undefined) return children

	return cloneElement(icon, {
		...props,
		className: cn(icon.props.className, props.className),
		style: icon.props.style || props.style ? { ...icon.props.style, ...props.style } : undefined,
	})
}
