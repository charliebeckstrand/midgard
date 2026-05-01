import { iro } from '../ryu/iro'
import { maru } from '../ryu/maru'

export const toggleIconButton = {
	base: [
		'relative',
		'flex',
		'items-center justify-center',
		maru.rounded.lg,
		iro.text.muted,
		iro.text.hover,
		iro.text.focus,
	],
	transition:
		'transition-[opacity,filter,scale] duration-300 ease-in-out will-change-[opacity,filter,scale]',
	active: 'scale-100 opacity-100 blur-0',
	inactive: 'blur-xs scale-[0.25] opacity-0',
}
