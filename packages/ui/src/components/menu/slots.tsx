import type { ComponentProps } from 'react'
import { cn, createSlot } from '../../core'
import { k } from '../../recipes/kata/menu'
import { Kbd, type KbdProps } from '../kbd'

/** Props for {@link MenuSection}: native `<fieldset>` attributes. */
export type MenuSectionProps = ComponentProps<'fieldset'>

/** Groups related menu items under a {@link MenuHeading}; renders a `<fieldset>`. */
export const MenuSection = createSlot('fieldset', 'menu-section', k.section)

/** Props for {@link MenuHeading}: native `<legend>` attributes. */
export type MenuHeadingProps = ComponentProps<'legend'>

/**
 * Names a {@link MenuSection}; renders a `<legend>`. Put it as the first child of a
 * `MenuSection` only. HTML allows a `<legend>` only as the first child of a
 * `<fieldset>`, so a `MenuHeading` in another place is invalid and names nothing.
 */
export const MenuHeading = createSlot('legend', 'menu-heading', k.heading)

/** Props for {@link MenuSeparator}: native `<hr>` attributes. */
export type MenuSeparatorProps = ComponentProps<'hr'>

/** Visual divider between menu groups; renders an `<hr>`. */
export const MenuSeparator = createSlot('hr', 'menu-separator', k.separator)

/** Props for {@link MenuLabel}: native `<span>` attributes. */
export type MenuLabelProps = ComponentProps<'span'>

/** Primary text of a {@link MenuItem}; renders a `<span>`. */
export const MenuLabel = createSlot('span', 'menu-label', k.label)

/** Props for {@link MenuText}: native `<span>` attributes. */
export type MenuTextProps = ComponentProps<'span'>

/**
 * Stacks a {@link MenuLabel} over a {@link MenuDescription} in a {@link MenuItem};
 * renders a `<span>`. Without it, the description sits beside the label. It takes
 * the free width of the row, so a leading icon stays beside the text.
 *
 * @example
 * ```tsx
 * <MenuItem>
 *   <MenuText>
 *     <MenuLabel>Orders</MenuLabel>
 *     <MenuDescription>Every sale, ten rows to a page</MenuDescription>
 *   </MenuText>
 * </MenuItem>
 * ```
 */
export const MenuText = createSlot('span', 'menu-text', k.text)

/** Props for {@link MenuDescription}: native `<span>` attributes. */
export type MenuDescriptionProps = ComponentProps<'span'>

/** Secondary descriptive text within a {@link MenuItem}; renders a `<span>`. */
export const MenuDescription = createSlot('span', 'menu-description', k.description)

/** Props for {@link MenuShortcut}: identical to {@link KbdProps}. */
export type MenuShortcutProps = KbdProps

/** Trailing keyboard-shortcut hint for a {@link MenuItem}; styled {@link Kbd}. */
export function MenuShortcut({ className, ...props }: MenuShortcutProps) {
	return <Kbd data-slot="menu-shortcut" className={cn(k.shortcut, className)} {...props} />
}
