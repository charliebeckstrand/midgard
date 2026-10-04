import { cn, dataAttr } from '../../core'
import { type DrawerPanelVariants, k } from '../../recipes/kata/drawer'

/**
 * The attributes and classes of the drawer panel that its slots and rows style off. {@link Drawer}
 * and {@link DrawerStatic} both spread them, so the static drawer paints the panel that the drawer
 * then mounts on top of it.
 *
 * `data-glass` opens the glass cascade to the panel contents: `hannou.tint.glass` keys on
 * `group-data-[glass]/glass`, which needs the named group and the attribute on one element. Rows
 * inside take their hover wash at double strength, because 5% under the translucency of the panel
 * reads as no hover at all.
 *
 * @internal
 */
export function drawerPanelProps({
	surface,
	height,
	className,
}: {
	surface: 'glass' | undefined
	height: DrawerPanelVariants['height']
	className: string | undefined
}) {
	const isGlass = surface === 'glass'

	return {
		'data-height': height ?? 'auto',
		'data-glass': dataAttr(isGlass),
		className: cn(
			'group/drawer',
			isGlass && 'group/glass',
			k.panel({ surface, height }),
			className,
		),
	}
}

/**
 * Whether the drawer shows its grip. The grip only resizes, so only a panel with a fixed height
 * (`half` or `full`) shows it. A panel grown to its content (`auto` or `fit`) has no height for the
 * grip to set. {@link Drawer} and {@link DrawerStatic} both read it, so the static drawer paints
 * the grip that the drawer then mounts.
 *
 * @internal
 */
export function drawerShowsGrip(
	handle: boolean | undefined,
	height: DrawerPanelVariants['height'],
): boolean {
	return handle === true && (height === 'half' || height === 'full')
}
