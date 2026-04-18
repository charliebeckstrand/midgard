import { kage } from '../kage'
import { ki } from '../ki'
import { kumi } from '../kumi'
import { maru } from '../maru'
import { sumi } from '../sumi'
import { take } from '../take'
import { yasumi } from '../yasumi'

export const signaturePad = {
	base: [
		'overflow-hidden',
		'relative isolate',
		'bg-white',
		kage.border,
		maru.rounded,
		ki.ring,
		yasumi.disabled,
	],
	canvas: ['block w-full h-full', 'cursor-crosshair touch-none select-none'],
	placeholder: [
		'absolute inset-0',
		'flex',
		kumi.center,
		take.text.sm,
		sumi.textMuted,
		'pointer-events-none',
	],
	actions: ['absolute right-2 bottom-2', 'flex items-center', take.gap.sm],
}
