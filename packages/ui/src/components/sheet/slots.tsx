import { cn } from '../../core'
import {
	createPanelSlots,
	type PanelActionsProps,
	type PanelDescriptionProps,
	type PanelTitleProps,
} from '../../primitives'
import { sheetBodyVariants } from './variants'

const { Title, Description, Actions } = createPanelSlots('sheet')

export type SheetTitleProps = PanelTitleProps
export type SheetDescriptionProps = PanelDescriptionProps
export type SheetActionsProps = PanelActionsProps

export { Actions as SheetActions, Description as SheetDescription, Title as SheetTitle }

/** SheetBody extends the panel body with flex-1 + scroll support */
export type SheetBodyProps = React.ComponentPropsWithoutRef<'div'>

export function SheetBody({ className, ...props }: SheetBodyProps) {
	return <div data-slot="sheet-body" className={cn(sheetBodyVariants(), className)} {...props} />
}
