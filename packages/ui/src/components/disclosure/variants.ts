import { cva } from 'class-variance-authority'
import { katachi } from '../../recipes'

const k = katachi.disclosure

export const disclosureButtonVariants = cva(k.button)

export const disclosurePanelVariants = cva(k.panel)
