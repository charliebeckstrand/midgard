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

/** Names a {@link MenuSection}; renders a `<legend>`. */
export const MenuHeading = createSlot('legend', 'menu-heading', k.heading)

/** Props for {@link MenuSeparator}: native `<hr>` attributes. */
export type MenuSeparatorProps = ComponentProps<'hr'>

/** Visual divider between menu groups; renders an `<hr>`. */
export const MenuSeparator = createSlot('hr', 'menu-separator', k.separator)

/** Props for {@link MenuLabel}: native `<span>` attributes. */
export type MenuLabelProps = ComponentProps<'span'>

/** Primary text of a {@link MenuItem}; renders a `<span>`. */
export const MenuLabel = createSlot('span', 'menu-label', k.label)

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
