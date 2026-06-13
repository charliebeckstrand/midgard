import { type ComponentPropsWithoutRef, type ReactNode, useId } from 'react'
import { cn } from '../../core'
import { k } from '../../recipes/kata/command-palette'
import { Alert, type AlertProps } from '../alert'
import { Kbd, type KbdProps } from '../kbd'

/** Props for {@link CommandPaletteGroup}; extends native `<div>` attributes, widening `title` to a `ReactNode`. */
export type CommandPaletteGroupProps = Omit<ComponentPropsWithoutRef<'div'>, 'title'> & {
	title?: ReactNode
}

/** Groups palette items under an optional `title` as a `role="group"` region within the listbox. */
export function CommandPaletteGroup({
	title,
	className,
	children,
	...props
}: CommandPaletteGroupProps) {
	const titleId = useId()

	return (
		// biome-ignore lint/a11y/useSemanticElements: role="group" is the valid listbox-owned grouping; a <fieldset> would be invalid inside role="listbox"
		<div
			data-slot="command-palette-group"
			role="group"
			aria-labelledby={title ? titleId : undefined}
			className={cn(k.group, className)}
			{...props}
		>
			{title && (
				<div id={titleId} data-slot="command-palette-title" className={cn(k.title)}>
					{title}
				</div>
			)}
			{children}
		</div>
	)
}

/** Props for {@link CommandPaletteEmpty}; same as {@link AlertProps}. */
export type CommandPaletteEmptyProps = AlertProps

/** Empty-state slot built on Alert, rendered when items filter down to nothing. */
export function CommandPaletteEmpty({ children, ...props }: CommandPaletteEmptyProps) {
	return (
		<Alert data-slot="command-palette-empty" {...props}>
			{children}
		</Alert>
	)
}

/** Props for {@link CommandPaletteLabel}; extends native `<span>` attributes. */
export type CommandPaletteLabelProps = ComponentPropsWithoutRef<'span'>

/** Primary text slot for a {@link CommandPaletteItem}. */
export function CommandPaletteLabel({ className, ...props }: CommandPaletteLabelProps) {
	return <span data-slot="command-palette-label" className={cn(k.label, className)} {...props} />
}

/** Props for {@link CommandPaletteDescription}; extends native `<span>` attributes. */
export type CommandPaletteDescriptionProps = ComponentPropsWithoutRef<'span'>

/** Secondary text slot for a {@link CommandPaletteItem}. */
export function CommandPaletteDescription({ className, ...props }: CommandPaletteDescriptionProps) {
	return (
		<span
			data-slot="command-palette-description"
			className={cn(k.description, className)}
			{...props}
		/>
	)
}

/** Props for {@link CommandPaletteShortcut}; same as {@link KbdProps}. */
export type CommandPaletteShortcutProps = KbdProps

/** Keyboard-shortcut hint slot for a {@link CommandPaletteItem}, built on Kbd. */
export function CommandPaletteShortcut({ className, ...props }: CommandPaletteShortcutProps) {
	return (
		<Kbd data-slot="command-palette-shortcut" className={cn(k.shortcut, className)} {...props} />
	)
}
