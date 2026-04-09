import {
	createPanelSlots,
	type PanelActionsProps,
	type PanelBodyProps,
	type PanelDescriptionProps,
	type PanelTitleProps,
} from '../../primitives'
import {
	drawerActionsVariants,
	drawerBodyVariants,
	drawerDescriptionVariants,
	drawerTitleVariants,
} from './variants'

export type DrawerTitleProps = PanelTitleProps
export type DrawerDescriptionProps = PanelDescriptionProps
export type DrawerBodyProps = PanelBodyProps
export type DrawerActionsProps = PanelActionsProps

const { Title, Description, Body, Actions } = createPanelSlots('drawer', {
	title: drawerTitleVariants,
	description: drawerDescriptionVariants,
	body: drawerBodyVariants,
	actions: drawerActionsVariants,
})

export {
	Actions as DrawerActions,
	Body as DrawerBody,
	Description as DrawerDescription,
	Title as DrawerTitle,
}
