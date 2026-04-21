import { maru } from '../maru'
import { sen } from '../sen'
import { yasumi } from '../yasumi'

export const map = {
	base: [
		'relative isolate overflow-hidden',
		'w-full h-full',
		sen.border,
		maru.rounded,
		yasumi.disabled,
	],
	canvas: ['absolute inset-0'],
}
