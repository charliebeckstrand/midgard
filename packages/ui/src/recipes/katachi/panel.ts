import { tv } from 'tailwind-variants'
import { narabi } from '../narabi'

export const panelTitle = tv({ base: [...narabi.panel.title] })
export const panelDescription = tv({ base: [...narabi.panel.description] })
export const panelBody = tv({ base: [...narabi.panel.body] })
export const panelActions = tv({ base: [...narabi.panel.actions] })
