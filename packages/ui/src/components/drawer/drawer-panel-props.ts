import { cn, dataAttr } from '../../core'
import { type DrawerPanelVariants, k } from '../../recipes/kata/drawer'

/**
 * The attributes and classes of the drawer panel that its slots and rows style off. {@link Drawer}
 * and {@link DrawerStandIn} both spread them, so the stand-in paints the panel that the drawer
 * then mounts on top of it.
 *
 * `data-glass` opens the glass cascade to the panel contents: `hannou.glassItem` keys on
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
