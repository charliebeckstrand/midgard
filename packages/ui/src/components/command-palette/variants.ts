import { cva, type VariantProps } from 'class-variance-authority'
import { katachi } from '../../recipes'

const k = katachi.commandPalette

export const commandPalettePanelVariants = cva(k.panel.base, {
	variants: { size: k.panel.size },
	defaultVariants: k.panel.defaults,
})

export type CommandPalettePanelVariants = VariantProps<typeof commandPalettePanelVariants>
