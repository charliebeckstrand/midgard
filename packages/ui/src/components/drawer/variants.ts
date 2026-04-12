import { cva, type VariantProps } from 'class-variance-authority'
import { katachi, omote } from '../../recipes'

const k = katachi.drawer

export const drawerPanelVariants = cva(k.panel.base, {
	variants: {
		glass: k.panel.glass,
	},
	defaultVariants: { glass: false },
})

export const drawerBackdropVariants = cva('absolute inset-0', {
	variants: {
		glass: {
			true: omote.backdrop.color,
			false: omote.backdrop.base,
		},
	},
	defaultVariants: { glass: false },
})

export const drawerTitleVariants = cva(k.title)

export const drawerDescriptionVariants = cva(k.description)

export const drawerActionsVariants = cva(k.actions)

export const drawerBodyVariants = cva(k.body)

export const drawerCloseVariants = cva(k.close)

export type DrawerPanelVariants = VariantProps<typeof drawerPanelVariants>
