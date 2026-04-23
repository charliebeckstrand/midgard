import { iro } from '../iro'
import { ji } from '../ji'
import { kumi } from '../kumi'
import { maru } from '../maru'
import { sawari } from '../sawari'
import { sen } from '../sen'

export const signaturePad = {
	base: [
		'overflow-hidden',
		'relative isolate',
		'bg-white',
		sen.border,
		maru.rounded.lg,
		sen.focus.ring,
		sawari.disabled,
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
