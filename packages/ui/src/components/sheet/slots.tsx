import { cn } from '../../core'
import type { PanelActionsProps, PanelDescriptionProps, PanelTitleProps } from '../../primitives'
import {
	sheetActionsVariants,
	sheetBodyVariants,
	sheetDescriptionVariants,
	sheetTitleVariants,
} from './variants'

export type SheetTitleProps = PanelTitleProps
export type SheetDescriptionProps = PanelDescriptionProps
export type SheetActionsProps = PanelActionsProps

export function SheetTitle({ className, ...props }: SheetTitleProps) {
	return <h2 data-slot="sheet-title" className={cn(sheetTitleVariants(), className)} {...props} />
}

export function SheetDescription({ className, ...props }: SheetDescriptionProps) {
	return (
		<p
			data-slot="sheet-description"
			className={cn(sheetDescriptionVariants(), className)}
			{...props}
		/>
	)
}

export type SheetBodyProps = React.ComponentPropsWithoutRef<'div'>

export function SheetBody({ className, ...props }: SheetBodyProps) {
	return <div data-slot="sheet-body" className={cn(sheetBodyVariants(), className)} {...props} />
}

export function SheetActions({ className, ...props }: SheetActionsProps) {
	return (
		<div data-slot="sheet-actions" className={cn(sheetActionsVariants(), className)} {...props} />
	)
}
