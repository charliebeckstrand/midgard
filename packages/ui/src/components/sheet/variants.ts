import { cva, type VariantProps } from 'class-variance-authority'
import { katachi } from '../../recipes'

const k = katachi.sheet

export const sheetPanelVariants = cva(k.panel.base, {
	variants: {
		side: k.panel.side,
		size: k.panel.size,
	},
	defaultVariants: k.panel.defaults,
})

export const sheetTitleVariants = cva(k.title)

export const sheetDescriptionVariants = cva(k.description)

export const sheetActionsVariants = cva(k.actions)

export const sheetBodyVariants = cva(k.body)

export const sheetCloseVariants = cva(k.close)

export type SheetPanelVariants = VariantProps<typeof sheetPanelVariants>
