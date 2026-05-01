import { maru } from '../ryu/maru'
import { sawari } from '../ryu/sawari'
import { sen } from '../ryu/sen'

export const map = {
	base: [
		'relative isolate overflow-hidden',
		'w-full h-full',
		sen.border,
		maru.rounded.lg,
		sawari.disabled,
	],
	canvas: ['absolute inset-0'],
}
