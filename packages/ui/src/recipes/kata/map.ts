import { maru } from '../maru'
import { sawari } from '../sawari'
import { sen } from '../sen'

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
