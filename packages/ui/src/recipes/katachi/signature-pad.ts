import { iro } from '../iro'
import { ji } from '../ji'
import { ki } from '../ki'
import { kumi } from '../kumi'
import { maru } from '../maru'
import { sen } from '../sen'
import { yasumi } from '../yasumi'

export const signaturePad = {
	base: [
		'overflow-hidden',
		'relative isolate',
		'bg-white',
		sen.border,
		maru.rounded,
		ki.ring,
		yasumi.disabled,
	],
	canvas: ['block w-full h-full', 'cursor-crosshair touch-none select-none'],
	placeholder: [
		'absolute inset-0',
		'flex',
		kumi.center,
		ji.size.sm,
		iro.text.muted,
		'pointer-events-none',
	],
	actions: ['absolute right-2 bottom-2', 'flex items-center', kumi.gap.sm],
}
