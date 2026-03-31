import { cn } from '../../core'
import {
	PanelActions,
	type PanelActionsProps,
	PanelDescription,
	type PanelDescriptionProps,
	PanelTitle,
	type PanelTitleProps,
} from '../../primitives'
import { sheetBodyVariants } from './variants'

export type SheetTitleProps = PanelTitleProps
export type SheetDescriptionProps = PanelDescriptionProps
export type SheetActionsProps = PanelActionsProps

export type SheetBodyProps = React.ComponentPropsWithoutRef<'div'>

export function SheetTitle(props: SheetTitleProps) {
	return <PanelTitle slot="sheet-title" {...props} />
}

export function SheetDescription(props: SheetDescriptionProps) {
	return <PanelDescription slot="sheet-description" {...props} />
}

export function SheetBody({ className, ...props }: SheetBodyProps) {
	return <div data-slot="sheet-body" className={cn(sheetBodyVariants(), className)} {...props} />
}

export function SheetActions(props: SheetActionsProps) {
	return <PanelActions slot="sheet-actions" {...props} />
}
