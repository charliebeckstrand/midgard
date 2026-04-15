import {
	createPanel,
	type PanelActionsProps,
	type PanelBodyProps,
	type PanelDescriptionProps,
	type PanelTitleProps,
} from '../../primitives'
import {
	sheetActionsVariants,
	sheetBodyVariants,
	sheetDescriptionVariants,
	sheetTitleVariants,
} from './variants'

export type SheetTitleProps = PanelTitleProps
export type SheetDescriptionProps = PanelDescriptionProps
export type SheetBodyProps = PanelBodyProps
export type SheetActionsProps = PanelActionsProps

const { Title, Description, Body, Actions } = createPanel('sheet', {
	title: sheetTitleVariants,
	description: sheetDescriptionVariants,
	body: sheetBodyVariants,
	actions: sheetActionsVariants,
})

export {
	Actions as SheetActions,
	Body as SheetBody,
	Description as SheetDescription,
	Title as SheetTitle,
}
