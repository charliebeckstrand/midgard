import { kage } from '../kage'
import { maru } from '../maru'
import { sumi } from '../sumi'
import { yasumi } from '../yasumi'

export const stepper = {
	base: 'flex w-full',
	orientation: {
		horizontal: 'flex-row items-start gap-4 px-4',
		vertical: 'flex-col items-start gap-4 pr-4 py-4',
	},

	step: {
		base: [
			// ── Layout ──────────────────────────────────────
			'group relative text-left',
			// ── Focus ───────────────────────────────────────
			'outline-none',
			// ── Tokens ──────────────────────────────────────
			yasumi.disabled,
		],
		orientation: {
			horizontal: 'flex shrink-0 flex-col items-center w-32 gap-0.5 text-center',
			vertical: [
				// ── Layout ──────────────────────────────────────
				'flex w-full items-center gap-4 py-1 first:pt-0',
				// ── Tokens ──────────────────────────────────────
				kage.borderSubtleColor,
			],
		},
	},

	content: 'flex flex-1 flex-col gap-1',

	indicator: {
		base: [
			// ── Layout ──────────────────────────────────────
			'relative',
			// ── Sizing ──────────────────────────────────────
			'size-3.5 shrink-0',
			// ── Tokens ──────────────────────────────────────
			maru.roundedFull,
			// ── Color (light) ───────────────────────────────
			'bg-zinc-400',
			// ── Color (dark) ────────────────────────────────
			'dark:bg-zinc-600',
		],
		interactive: [
			// ── Hover ───────────────────────────────────────
			'group-enabled:group-hover:bg-zinc-500',
			// ── Focus ───────────────────────────────────────
			'group-focus-visible:outline-2 group-focus-visible:outline-blue-600',
		],
	},

	title: {
		base: [
			// ── Typography ──────────────────────────────────
			'text-sm font-medium leading-none',
			// ── Color (light) ───────────────────────────────
			'text-zinc-400',
			// ── Color (dark) ────────────────────────────────
			'dark:text-zinc-600',
		],
		interactive: [
			// ── Data-[state=current] ────────────────────────
			'group-data-[state=current]:text-zinc-950 dark:group-data-[state=current]:text-white',
			// ── Hover ───────────────────────────────────────
			'group-enabled:group-hover:group-not-data-[state=current]:text-zinc-500',
		],
		orientation: {
			horizontal: 'mt-2',
			vertical: '',
		},
	},

	description: ['text-xs/4', sumi.textMuted],

	separator: {
		base: 'shrink-0',
		orientation: {
			horizontal: [
				// ── Layout ──────────────────────────────────────
				'-mx-12 mt-2 flex-1 self-start',
				// ── Border ──────────────────────────────────────
				'border-t',
				// ── Tokens ──────────────────────────────────────
				kage.borderColor,
			],
			vertical: 'hidden',
		},
	},

	activeIndicator: [
		// ── Layout ──────────────────────────────────────
		'z-30',
		// ── Color ───────────────────────────────────────
		'bg-blue-600 dark:bg-blue-600',
	],
	defaults: { orientation: 'horizontal' as const },
}
