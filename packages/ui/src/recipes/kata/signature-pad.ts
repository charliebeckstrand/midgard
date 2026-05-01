import { iro } from '../ryu/iro'
import { ji } from '../ryu/ji'
import { kumi } from '../ryu/kumi'
import { maru } from '../ryu/maru'
import { sawari } from '../ryu/sawari'
import { sen } from '../ryu/sen'

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
		'items-center justify-center',
		ji.size.sm,
		iro.text.muted,
		'pointer-events-none',
	],
	actions: ['absolute right-2 bottom-2', 'flex items-center', kumi.gap.sm],
}
