import { kage } from '../kage'
import { maru } from '../maru'
import { yasumi } from '../yasumi'

export const map = {
	base: [
		'relative isolate overflow-hidden',
		'w-full h-full',
		kage.border,
		maru.rounded,
		yasumi.disabled,
	],
	canvas: ['absolute inset-0'],
}
