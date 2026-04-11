import { ki } from '../ki'
import { sumi } from '../sumi'

export const collapse = {
	trigger: [
		'inline-flex items-center gap-1 text-sm font-medium',
		sumi.textMuted,
		sumi.textHover,
		'disabled:opacity-50 disabled:cursor-not-allowed',
		ki.ring,
	],
	panel: 'overflow-hidden',
}
