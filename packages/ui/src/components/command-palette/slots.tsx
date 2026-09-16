'use client'

import { type ComponentProps, useEffect, useMemo } from 'react'
import { cn, createContext, createSlot } from '../../core'
import { type A11yRelation, useA11yScope } from '../../hooks'
import { k } from '../../recipes/kata/command-palette'
import { Kbd, type KbdProps } from '../kbd'

// A stable reference; an inline literal re-derives the scope every render.
const GROUP_SLOTS = { heading: 'labelledby' } satisfies Record<string, A11yRelation>

type CommandPaletteGroupContextValue = {
	headingId: string
	/** Called by a mounted heading with the id it renders; the group names itself from that id. */
	register: (renderedId?: string) => () => void
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
	// The library's slot-registration scope, which Panel and Control also build
	// on. It reference-counts, so a remounting heading cannot drop the name, and
	// it takes the id the heading renders rather than assuming the derived one.
	const scope = useA11yScope({ slots: GROUP_SLOTS })

	const value = useMemo<CommandPaletteGroupContextValue>(
		() => ({ headingId: scope.ids.heading, register: scope.register.heading }),
		[scope.ids.heading, scope.register.heading],
	)

	return (
		// biome-ignore lint/a11y/useSemanticElements: role="group" is the valid listbox-owned grouping; a <fieldset> would be invalid inside role="listbox"
		<div
			data-slot="command-palette-group"
			role="group"
			{...scope.ariaProps}
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
export function CommandPaletteHeading({ className, id, ...props }: CommandPaletteHeadingProps) {
	const group = useCommandPaletteGroupContext()

	const register = group?.register

	// The id the element renders, which a caller's own `id` wins. It is the id
	// registered too, so the group's `aria-labelledby` always names the element
	// that is there.
	const headingId = id ?? group?.headingId

	useEffect(() => register?.(headingId), [register, headingId])

	return (
		<div
			id={headingId}
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
