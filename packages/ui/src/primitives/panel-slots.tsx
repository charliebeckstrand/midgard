import { cva } from 'class-variance-authority'
import { cn } from '../core'
import { sumi } from '../recipes'

export const panelTitleVariants = cva([sumi.base, 'text-lg/7 font-semibold'])

export const panelDescriptionVariants = cva([sumi.usui, 'text-base/6'])

export const panelBodyVariants = cva('mt-4')

export const panelActionsVariants = cva('mt-6 flex items-center justify-end gap-3')

export type PanelTitleProps = React.ComponentPropsWithoutRef<'h2'>
export type PanelDescriptionProps = React.ComponentPropsWithoutRef<'p'>
export type PanelBodyProps = React.ComponentPropsWithoutRef<'div'>
export type PanelActionsProps = React.ComponentPropsWithoutRef<'div'>

/**
 * Creates a set of named panel slot components for a given prefix.
 *
 * Dialog, Sheet, and any future panel-like component (Drawer, etc.)
 * can generate their Title, Description, Body, and Actions in one call.
 *
 * @example
 * ```ts
 * const { Title, Description, Body, Actions } = createPanelSlots('dialog')
 * // Title renders <h2 data-slot="dialog-title" ...>
 * ```
 */
type PanelSlotVariants = {
	title?: () => string
	description?: () => string
	body?: () => string
	actions?: () => string
}

export function createPanelSlots(prefix: string, variants?: PanelSlotVariants) {
	const titleCva = variants?.title ?? panelTitleVariants
	const descriptionCva = variants?.description ?? panelDescriptionVariants
	const bodyCva = variants?.body ?? panelBodyVariants
	const actionsCva = variants?.actions ?? panelActionsVariants

	function Title({ className, ...props }: PanelTitleProps) {
		return <h2 data-slot={`${prefix}-title`} className={cn(titleCva(), className)} {...props} />
	}

	function Description({ className, ...props }: PanelDescriptionProps) {
		return (
			<p
				data-slot={`${prefix}-description`}
				className={cn(descriptionCva(), className)}
				{...props}
			/>
		)
	}

	function Body({ className, ...props }: PanelBodyProps) {
		return <div data-slot={`${prefix}-body`} className={cn(bodyCva(), className)} {...props} />
	}

	function Actions({ className, ...props }: PanelActionsProps) {
		return (
			<div data-slot={`${prefix}-actions`} className={cn(actionsCva(), className)} {...props} />
		)
	}

	return { Title, Description, Body, Actions }
}
