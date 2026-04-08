import { cva, type VariantProps } from 'class-variance-authority'
import { katachi, omote } from '../../recipes'

const k = katachi.sheet

export const sheetPanelVariants = cva(k.panel.base, {
	variants: {
		side: k.panel.side,
		size: k.panel.size,
		glass: k.panel.glass,
	},
	defaultVariants: { ...k.panel.defaults, glass: false },
})

export const sheetBackdropVariants = cva('absolute inset-0', {
	variants: {
		glass: {
			true: [omote.backdrop.color, 'backdrop-blur-lg'],
			false: omote.backdrop.base,
		},
	},
	defaultVariants: { glass: false },
})

export const sheetTitleVariants = cva(k.title)

export const sheetDescriptionVariants = cva(k.description)

export const sheetActionsVariants = cva(k.actions)

export const sheetBodyVariants = cva(k.body)

export const sheetCloseVariants = cva(k.close)

export type SheetPanelVariants = VariantProps<typeof sheetPanelVariants>
