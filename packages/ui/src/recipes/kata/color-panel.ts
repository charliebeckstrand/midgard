/**
 * Color-panel kata: the saturation/value picking surface. The root and the
 * inner pieces (area, track, preview, handle, swatches) take the step of the
 * nearest density scope through stepped classes; the pieces attach as slot
 * extras. The wash gradients and the
 * alpha/preview chequerboard are authored as raw CSS background-image literals
 * here rather than as kiso tokens — they're picker-specific, used nowhere else.
 */

import { defineScale } from '../../core/density'
import { defineRecipe } from '../../core/recipe'
import { kasane, kokkaku, sen } from '../kiso'
import { dan } from '../kiso/dan'

const { rounded } = kasane
const { focus, ring } = sen

// Draggable circular handle, centered on its inline-positioned coordinate.
const handle = [
	'absolute pointer-events-none',
	'size-4 -translate-x-1/2 -translate-y-1/2',
	rounded.full,
	'border-2 border-white shadow-sm ring-1 ring-black/25',
] as const

const area = ['relative w-full cursor-crosshair touch-none', ...focus.ring, dan.size.colorArea]

const track = [
	'relative w-full cursor-pointer touch-none',
	rounded.full,
	...focus.outline,
	dan.size.colorChannel,
]

const preview = ['relative shrink-0 overflow-hidden', rounded.md, dan.size.colorPreview]

export const k = defineRecipe(
	{
		base: ['flex flex-col select-none', kokkaku.colorPanel.width, dan.gap.loose],
		skeleton: kokkaku.colorPanel,
	},
	{
		area: {
			base: area,
			/** White-to-transparent wash painting the saturation axis over the hue base. */
			saturation: 'absolute inset-0 [background-image:linear-gradient(to_right,#fff,transparent)]',
			/** Transparent-to-black wash painting the value axis. */
			value: 'absolute inset-0 [background-image:linear-gradient(to_top,#000,transparent)]',
		},
		track: {
			base: track,
			/**
			 * The native range input over the track. It is transparent and lets the
			 * pointer through, so the track keeps the drag. The input keeps the
			 * focus, the keys, and the semantics.
			 */
			input: 'absolute inset-0 m-0 size-full appearance-none opacity-0 pointer-events-none',
		},
		preview: {
			base: preview,
			/**
			 * Preview swatch + hex field share a row beneath the sliders. The gap
			 * also caps the hit areas (`TouchTarget`), so the copy button of the hex
			 * field and the eyedropper after it do not overlap.
			 */
			row: 'flex items-center gap-2 [--touch-target-gap-x:--spacing(2)]',
		},
		handle,
		/** Full hue wheel laid left to right for the hue track. */
		hue: '[background-image:linear-gradient(to_right,#f00,#ff0,#0f0,#0ff,#00f,#f0f,#f00)]',
		/** Alpha / preview chequerboard surfaced behind translucent color. */
		checkerboard:
			'[background-image:repeating-conic-gradient(#cbd5e1_0_25%,#fff_0_50%)] [background-size:12px_12px] dark:[background-image:repeating-conic-gradient(#3f3f46_0_25%,#52525b_0_50%)]',
		/** Full-width stack for the hue (and optional alpha) tracks. */
		sliders: 'flex flex-col gap-2',
		/** Label-above-input column for one channel input. */
		field: 'flex min-w-0 flex-col gap-1',
		label: 'text-[10px] font-medium uppercase tracking-wide text-zinc-500 dark:text-zinc-400',
		swatches: 'grid grid-cols-10 gap-1.5',
		/**
		 * One preset chip: a label around a visually hidden radio. The inset ring
		 * gives a white or a black chip an edge on the panel. The outline shows
		 * when the radio inside has keyboard focus.
		 */
		swatch: [
			'relative aspect-square w-full cursor-pointer rounded-md',
			...ring.inset,
			'hover:scale-110',
			...focus.outline,
		],
	},
)

/** The size scale of {@link ColorPanel}: the steps of its area, channels, preview, and gap. */
export const scale = defineScale(
	dan.size.colorArea,
	dan.size.colorChannel,
	dan.size.colorPreview,
	dan.gap.loose,
)
