'use client'

import { type ComponentProps, useEffect, useId, useMemo, useState } from 'react'
import { cn, createContext, createSlot } from '../../core'
import { k } from '../../recipes/kata/command-palette'
import { Kbd, type KbdProps } from '../kbd'

type CommandPaletteGroupContextValue = {
	headingId: string
	/** Called by a mounted heading; the group names itself from it while one is rendered. */
	register: () => () => void
}

/**
 * Carries the group's generated heading id down to its {@link CommandPaletteHeading},
 * and the registration that tells the group a heading rendered.
 *
 * @internal
 */
const [CommandPaletteGroupContext, useCommandPaletteGroupContext] = createContext<
	CommandPaletteGroupContextValue | undefined
>('CommandPaletteGroup', {
	default: undefined,
})

/** Props for {@link CommandPaletteGroup}; extends native `<div>` attributes. */
export type CommandPaletteGroupProps = ComponentProps<'div'>

/**
 * Groups palette items as a `role="group"` region within the listbox. Nest a
 * {@link CommandPaletteHeading} to name it, the way `<MenuSection>` pairs with
 * `<MenuHeading>`.
 *
 * @remarks
 * The pair replaces the old `title` prop, so grouping is composition here as it
 * is in Menu. The grouping is `role="group"` and not a `<fieldset>`, which a
 * `role="listbox"` owner would reject.
 */
export function CommandPaletteGroup({ className, children, ...props }: CommandPaletteGroupProps) {
	const headingId = useId()

	const [named, setNamed] = useState(false)

	const value = useMemo<CommandPaletteGroupContextValue>(
		() => ({
			headingId,
			register: () => {
				setNamed(true)

				return () => setNamed(false)
			},
		}),
		[headingId],
	)

	return (
		// biome-ignore lint/a11y/useSemanticElements: role="group" is the valid listbox-owned grouping; a <fieldset> would be invalid inside role="listbox"
		<div
			data-slot="command-palette-group"
			role="group"
			aria-labelledby={named ? headingId : undefined}
			className={cn(k.group, className)}
			{...props}
		>
			<CommandPaletteGroupContext value={value}>{children}</CommandPaletteGroupContext>
		</div>
	)
}

/** Props for {@link CommandPaletteHeading}; extends native `<div>` attributes. */
export type CommandPaletteHeadingProps = ComponentProps<'div'>

/**
 * Names the enclosing {@link CommandPaletteGroup}; renders the group's visible
 * title and registers as its `aria-labelledby` target.
 */
export function CommandPaletteHeading({ className, ...props }: CommandPaletteHeadingProps) {
	const group = useCommandPaletteGroupContext()

	const register = group?.register

	useEffect(() => register?.(), [register])

	return (
		<div
			id={group?.headingId}
			data-slot="command-palette-title"
			className={cn(k.title, className)}
			{...props}
		/>
	)
}

/** Props for {@link CommandPaletteLabel}; extends native `<span>` attributes. */
export type CommandPaletteLabelProps = ComponentProps<'span'>

/** Primary text slot for a {@link CommandPaletteItem}. */
export const CommandPaletteLabel = createSlot('span', 'command-palette-label', k.label)

/** Props for {@link CommandPaletteDescription}; extends native `<span>` attributes. */
export type CommandPaletteDescriptionProps = ComponentProps<'span'>

/** Secondary text slot for a {@link CommandPaletteItem}. */
export const CommandPaletteDescription = createSlot(
	'span',
	'command-palette-description',
	k.description,
)

/** Props for {@link CommandPaletteShortcut}; same as {@link KbdProps}. */
export type CommandPaletteShortcutProps = KbdProps

/** Keyboard-shortcut hint slot for a {@link CommandPaletteItem}, built on Kbd. */
export function CommandPaletteShortcut({ className, ...props }: CommandPaletteShortcutProps) {
	return (
		<Kbd data-slot="command-palette-shortcut" className={cn(k.shortcut, className)} {...props} />
	)
}
