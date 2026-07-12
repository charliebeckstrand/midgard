'use client'

import { Ban } from 'lucide-react'
import type { ReactNode } from 'react'
import { Badge } from '../../components/badge'
import { Button } from '../../components/button'
import { Icon } from '../../components/icon'
import {
	Menu,
	MenuContent,
	MenuItem,
	MenuLabel,
	MenuSeparator,
	MenuTrigger,
} from '../../components/menu'
import { colors, extendedColors, type PaletteColor } from '../../core/recipe'

/** The palette presets offered by the color Menu: standard palette then extended. @internal */
export const DEFAULT_COLOR_OPTIONS: PaletteColor[] = [...colors, ...extendedColors]

/** Capitalizes a palette color name for display (`violet` → `Violet`). @internal */
function colorLabel(color: PaletteColor): string {
	return color.charAt(0).toUpperCase() + color.slice(1)
}

/** Props for {@link GridManagerColorMenu}. @internal */
type GridManagerColorMenuProps = {
	/** The owning group's display label, naming the menu and its trigger. */
	label: string
	/** The group's current color; `undefined` offers no clear item. */
	color: PaletteColor | undefined
	colorOptions: PaletteColor[]
	/** Colors already claimed by sibling groups, offered disabled; omit to offer all. */
	usedColors?: Set<PaletteColor>
	/** Sets the group's color, or clears it with `undefined`. */
	onRecolor: (color: PaletteColor | undefined) => void
	className?: string
}

/**
 * A manager group's color Menu — a "None" item to clear (offered only once a
 * color is set) plus a Badge-swatch per palette color. Shared by the column
 * group manager (which disables colors sibling groups already claim) and the
 * row manager.
 *
 * @internal
 */
export function GridManagerColorMenu({
	label,
	color,
	colorOptions,
	usedColors,
	onRecolor,
	className,
}: GridManagerColorMenuProps): ReactNode {
	return (
		<Menu aria-label={`Color menu for ${label}`} placement="bottom-end" className={className}>
			<MenuTrigger>
				<Button type="button" color={color} variant="soft" aria-label={`Color for ${label}`}>
					{color ? colorLabel(color) : 'Color'}
				</Button>
			</MenuTrigger>
			<MenuContent>
				{/* Clear the color — offered only once the group has one to clear. */}
				{color !== undefined && (
					<MenuItem onAction={() => onRecolor(undefined)}>
						<Icon icon={<Ban />} />
						<MenuLabel>None</MenuLabel>
					</MenuItem>
				)}
				{color !== undefined && <MenuSeparator />}
				{colorOptions.map((option) => (
					<MenuItem
						key={option}
						onAction={() => onRecolor(option)}
						disabled={usedColors?.has(option)}
					>
						<Badge color={option} variant="soft">
							{colorLabel(option)}
						</Badge>
					</MenuItem>
				))}
			</MenuContent>
		</Menu>
	)
}
