import { cva, type VariantProps } from 'class-variance-authority'
import { katachi } from '../../recipes'

const k = katachi.inspector

export const inspectorPanelVariants = cva(k.panel.base, {
	variants: {
		side: k.panel.side,
		size: k.panel.size,
	},
	defaultVariants: k.panel.defaults,
})

export const inspectorTitleVariants = cva(k.title)

export const inspectorDescriptionVariants = cva(k.description)

export const inspectorActionsVariants = cva(k.actions)

export const inspectorBodyVariants = cva(k.body)

export const inspectorCloseVariants = cva(k.close)

export type InspectorPanelVariants = VariantProps<typeof inspectorPanelVariants>
