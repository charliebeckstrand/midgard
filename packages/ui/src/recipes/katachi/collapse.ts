import { sumi } from '../sumi'

export const collapse = {
	trigger: [
		'justify-start rounded-none border-0 after:hidden',
		'ring-inset',
		sumi.textMuted,
		sumi.textHover,
		'font-medium',
	],
	panel: 'overflow-hidden',
}
