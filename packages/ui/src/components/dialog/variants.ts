import { cva, type VariantProps } from 'class-variance-authority'
import { katachi } from '../../recipes'

const k = katachi.dialog
const p = katachi.panel

export const dialogPanelVariants = cva(k.panel.base, {
	variants: { size: k.panel.size },
	defaultVariants: k.panel.defaults,
})

export const dialogTitleVariants = cva(p.title)
export const dialogDescriptionVariants = cva(p.description)
export const dialogBodyVariants = cva(p.body)
export const dialogActionsVariants = cva(p.actions)

export type DialogPanelVariants = VariantProps<typeof dialogPanelVariants>
