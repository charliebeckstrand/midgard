import { kumi } from '../kumi'
import { maru } from '../maru'
import { sumi } from '../sumi'
import { take } from '../take'

export const toggleIconButton = {
	base: [
		'relative',
		'flex',
		kumi.center,
		maru.rounded,
		sumi.textMuted,
		sumi.textHover,
		sumi.textFocus,
	],
	size: take.buttonWithIconSize,
	transition:
		'transition-[opacity,filter,scale] duration-300 ease-in-out will-change-[opacity,filter,scale]',
	active: 'scale-100 opacity-100 blur-0',
	inactive: 'blur-xs scale-[0.25] opacity-0',
}
