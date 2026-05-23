import {
	createPanel,
	type PanelActionsProps,
	type PanelBodyProps,
	type PanelDescriptionProps,
	type PanelHeaderProps,
	type PanelTitleProps,
} from '../../primitives/panel'
import { k } from '../../recipes/kata/drawer'

export type DrawerTitleProps = PanelTitleProps
export type DrawerDescriptionProps = PanelDescriptionProps
export type DrawerHeaderProps = PanelHeaderProps
export type DrawerBodyProps = PanelBodyProps
export type DrawerActionsProps = PanelActionsProps

const { Title, Description, Header, Body, Actions } = createPanel('drawer', {
	title: k.title,
	description: k.description,
	header: k.header,
	body: k.body,
	actions: k.actions,
})

export {
	Actions as DrawerActions,
	Body as DrawerBody,
	Description as DrawerDescription,
	Header as DrawerHeader,
	Title as DrawerTitle,
}
