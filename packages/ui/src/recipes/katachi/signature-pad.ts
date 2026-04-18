import { kage } from '../kage'
import { ki } from '../ki'
import { kumi } from '../kumi'
import { maru } from '../maru'
import { sumi } from '../sumi'
import { yasumi } from '../yasumi'

export const signaturePad = {
	base: [
		'relative isolate',
		'bg-white',
		kage.border,
		maru.rounded,
		ki.ring,
		yasumi.disabled,
		'overflow-hidden',
	],
	canvas: ['block w-full h-full', 'cursor-crosshair touch-none select-none'],
	placeholder: [
		'absolute inset-0',
		'flex',
		kumi.center,
		'pointer-events-none',
		'text-sm/5',
		sumi.textMuted,
	],
	actions: ['absolute right-2 bottom-2', 'flex items-center gap-1'],
}
