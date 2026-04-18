import { tv } from 'tailwind-variants'
import { narabi } from '../narabi'

export const panelBase = tv({ base: narabi.panel.base })
export const panelTitle = tv({ base: [...narabi.panel.title] })
export const panelDescription = tv({ base: [...narabi.panel.description] })
export const panelBody = tv({ base: [...narabi.panel.body] })
export const panelActions = tv({ base: [...narabi.panel.actions] })

/** Shared slot classes (read by primitives/panel.tsx). */
export const panel = {
	base: narabi.panel.base,
	title: narabi.panel.title,
	description: narabi.panel.description,
	body: narabi.panel.body,
	actions: narabi.panel.actions,
}
