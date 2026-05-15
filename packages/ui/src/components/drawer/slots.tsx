import {
	createPanel,
	type PanelActionsProps,
	type PanelBodyProps,
	type PanelDescriptionProps,
	type PanelTitleProps,
} from '../../primitives/panel'
import { drawer } from '../../recipes/kata/drawer'

export type DrawerTitleProps = PanelTitleProps
export type DrawerDescriptionProps = PanelDescriptionProps
export type DrawerBodyProps = PanelBodyProps
export type DrawerActionsProps = PanelActionsProps

const { Title, Description, Body, Actions } = createPanel('drawer', {
	title: drawer.title,
	description: drawer.description,
	body: drawer.body,
	actions: drawer.actions,
})

export {
	Actions as DrawerActions,
	Body as DrawerBody,
	Description as DrawerDescription,
	Title as DrawerTitle,
}
