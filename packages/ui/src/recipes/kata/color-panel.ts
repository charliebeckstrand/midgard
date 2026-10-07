/**
 * Color-panel kata: the saturation/value picking surface. The pieces attach as
 * slot extras. Stepped classes give the width and the gap of the root the step
 * of the nearest density scope. The `area`, `track`, and `preview` pieces take
 * that step too. The `handle` and the `swatches` have a fixed size at each step.
 *
 * The wash gradients are raw CSS `background-image` literals here, not kiso
 * tokens, because only the panel uses them. The checkerboard behind the alpha
 * track and the preview is `omote.checkerboard`, which the color picker shares.
 */

import { defineScale } from '../../core/density'
import { defineRecipe } from '../../core/recipe'
import { kasane, kokkaku, omote, sen } from '../kiso'
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

const area = [
	'relative w-full cursor-crosshair touch-none',
	...focus.ring,
	dan.size.colorPanel.area,
]

const track = [
	'relative w-full cursor-pointer touch-none',
	rounded.full,
	...focus.outline,
	dan.size.colorPanel.channel,
]

const preview = ['relative shrink-0 overflow-hidden', rounded.md, dan.size.colorPanel.preview]

export const k = defineRecipe(
	{
		base: ['flex flex-col select-none', kokkaku.colorPanel.width, dan.gap.loose],
		skeleton: kokkaku.colorPanel,
	},
	{
		area: {
			base: area,
			/** White-to-transparent wash painting the saturation axis over the hue base. */
			saturation: 'absolute inset-0 bg-[linear-gradient(to_right,#fff,transparent)]',
			/** Transparent-to-black wash painting the value axis. */
			value: 'absolute inset-0 bg-[linear-gradient(to_top,#000,transparent)]',
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
			row: ['flex items-center', dan.gap.scale.sm, ...dan.gap.touch.x.sm],
		},
		handle,
		/** Full hue wheel laid left to right for the hue track. */
		hue: 'bg-[linear-gradient(to_right,#f00,#ff0,#0f0,#0ff,#00f,#f0f,#f00)]',
		/** Alpha / preview chequerboard surfaced behind translucent color. */
		checkerboard: [omote.checkerboard, 'bg-size-[12px_12px]'],
		/** Full-width stack for the hue (and optional alpha) tracks. */
		sliders: `flex flex-col ${dan.gap.scale.sm}`,
		/** The grid of the channel inputs. */
		channels: ['grid', dan.gap.scale.sm],
		/** Label-above-input column for one channel input. */
		field: `flex min-w-0 flex-col ${dan.gap.scale.xs}`,
		label: 'text-[10px] font-medium uppercase tracking-wide text-zinc-500 dark:text-zinc-400',
		swatches: 'grid grid-cols-10 gap-1.5',
		/**
		 * One preset chip: a label around a visually hidden radio. The inset ring
		 * gives a white or a black chip an edge on the panel. The outline shows
		 * when the radio inside has keyboard focus.
		 */
		swatch: [
			'relative cursor-pointer',
			kokkaku.colorPanel.swatch,
			rounded.md,
			...ring.inset,
			'hover:scale-110',
			...focus.outline,
		],
	},
)

/** The size scale of {@link ColorPanel}: the steps of its area, channels, preview, and gap. */
export const scale = defineScale(
	dan.size.colorPanel.area,
	dan.size.colorPanel.channel,
	dan.size.colorPanel.preview,
	dan.gap.loose,
)
