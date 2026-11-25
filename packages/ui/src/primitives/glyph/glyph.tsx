import type { LucideIcon, LucideProps } from 'lucide-react'
import type { ReactElement } from 'react'
import { GlyphSlot } from './glyph-slot'
import type { IconName } from './types'

/** Props for {@link Glyph}: the Lucide `icon` to draw, plus the props of a Lucide icon. */
export type GlyphProps = LucideProps & {
	/** The Lucide icon, imported from `lucide-react` by its own name, such as `X`. */
	icon: LucideIcon
}

/**
 * Draws a Lucide icon of ui: the icon that `<UIProvider icons>` registers for
 * the name of `icon`, or `icon` itself. Each component of ui draws its icons
 * through it, so an app can replace each icon of ui (CONVENTIONS §5.13).
 *
 * @remarks
 * Static leaf: renders in React Server Components. It renders the Lucide
 * default, and a client part swaps in the registered icon. Lucide names each
 * icon by its own name, also under an alias, and that name is the key of
 * `Icons`.
 *
 * @example
 *   <Glyph icon={X} className="size-4" />
 */
export function Glyph({ icon: Fallback, ...props }: GlyphProps): ReactElement {
	return (
		<GlyphSlot {...props} name={Fallback.displayName as IconName}>
			<Fallback {...props} />
		</GlyphSlot>
	)
}
