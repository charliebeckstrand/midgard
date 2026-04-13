import { maru } from '../maru'
import { narabi } from '../narabi'
import { take } from '../take'

export const copyButton = {
	base: [
		'relative p-0',
		narabi.position.center,
		maru.rounded,
		'text-zinc-400',
		'hover:not-disabled:text-white',
		'focus-visible:not-disabled:text-white',
		'disabled:text-green-600 disabled:opacity-100 disabled:cursor-default',
	],
	size: take.buttonWithIconSize,
}
