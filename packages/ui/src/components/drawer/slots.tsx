import {
	createPanel,
	type PanelActionsProps,
	type PanelBodyProps,
	type PanelDescriptionProps,
	type PanelTitleProps,
} from '../../primitives/panel'
import { k } from '../../recipes/kata/drawer'

export type DrawerTitleProps = PanelTitleProps
export type DrawerDescriptionProps = PanelDescriptionProps
export type DrawerBodyProps = PanelBodyProps
export type DrawerActionsProps = PanelActionsProps

const { Title, Description, Body, Actions } = createPanel('drawer', {
	title: k.title,
	description: k.description,
	body: k.body,
	actions: k.actions,
})

export {
	Actions as DrawerActions,
	Body as DrawerBody,
	Description as DrawerDescription,
	Title as DrawerTitle,
}
