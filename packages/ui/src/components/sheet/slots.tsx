import {
	createPanel,
	type PanelActionsProps,
	type PanelBodyProps,
	type PanelDescriptionProps,
	type PanelHeaderProps,
	type PanelTitleProps,
} from '../../primitives/panel'
import { k } from '../../recipes/kata/sheet'

export type SheetTitleProps = PanelTitleProps
export type SheetDescriptionProps = PanelDescriptionProps
export type SheetHeaderProps = PanelHeaderProps
export type SheetBodyProps = PanelBodyProps
export type SheetActionsProps = PanelActionsProps

const { Title, Description, Header, Body, Actions } = createPanel('sheet', {
	title: k.title,
	description: k.description,
	header: k.header,
	body: k.body,
	actions: k.actions,
})

export {
	Actions as SheetActions,
	Body as SheetBody,
	Description as SheetDescription,
	Header as SheetHeader,
	Title as SheetTitle,
}
