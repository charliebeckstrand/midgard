import {
	createPanel,
	type PanelActionsProps,
	type PanelBodyProps,
	type PanelDescriptionProps,
	type PanelTitleProps,
} from '../../primitives/panel'
import { k as sheet } from '../../recipes/kata/sheet'

export type SheetTitleProps = PanelTitleProps
export type SheetDescriptionProps = PanelDescriptionProps
export type SheetBodyProps = PanelBodyProps
export type SheetActionsProps = PanelActionsProps

const { Title, Description, Body, Actions } = createPanel('sheet', {
	title: sheet.title,
	description: sheet.description,
	body: sheet.body,
	actions: sheet.actions,
})

export {
	Actions as SheetActions,
	Body as SheetBody,
	Description as SheetDescription,
	Title as SheetTitle,
}
