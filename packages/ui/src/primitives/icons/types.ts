import type { CSSProperties, ReactElement } from 'react'
import type * as glyphs from './icons'

/**
 * The name of an icon that ui draws: the own name of its Lucide glyph, such
 * as `X` or `ChevronRight`.
 */
export type IconName = keyof typeof glyphs

/**
 * The icons that an app gives in place of the Lucide defaults of ui, by the
 * Lucide name of each glyph. Each value replaces its glyph everywhere ui draws
 * it. A glyph with no value keeps its Lucide default.
 *
 * Each value is an element, so that a server layout can give the map to a
 * client provider. The element gets the props of the glyph: `className`,
 * `style`, `data-*`, and ARIA attributes. Its component must forward them to
 * the `<svg>` that it renders, as the `icon` of `Icon` must.
 *
 * @example
 *   <UIProvider icons={{ X: <FontAwesomeIcon icon={faXmark} /> }}>
 */
export type Icons = Partial<
	Record<IconName, ReactElement<{ className?: string; style?: CSSProperties }>>
>
