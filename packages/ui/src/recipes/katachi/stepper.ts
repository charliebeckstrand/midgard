import { maru } from '../maru'
import { sumi } from '../sumi'
import { yasumi } from '../yasumi'

export const stepper = {
	base: 'flex w-full',
	orientation: {
		horizontal: 'flex-row items-start gap-3 px-3',
		vertical: 'flex-col items-stretch gap-3',
	},
	step: {
		base: ['group relative text-left outline-none', yasumi.disabled],
		orientation: {
			horizontal: 'flex w-32 shrink-0 flex-col items-center gap-0.5 text-center',
			vertical: [
				// flex row: indicator on the left, content column on the right.
				// items-start keeps the indicator at the top of the step so its center aligns
				// with the title's first line (the content column applies its own top offset).
				'relative flex items-start gap-3 min-h-8 max-w-128',
				// connector line from indicator down to next step's indicator (hidden on last step)
				'after:absolute after:left-4 after:top-8 after:-bottom-6 after:my-3 after:w-px',
				'after:-translate-x-1/2 after:bg-zinc-200 after:content-[""]',
				'dark:after:bg-zinc-800',
				'last:after:hidden',
			],
		},
	},
	// vertical-only wrapper for non-indicator children. mt-1.5 (6px) shifts the title
	// down so its first-line text center (line-height/2 = 10) lands at y=16 — the
	// indicator's vertical center (size-8 / 2 = 16).
	content: 'flex flex-1 flex-col gap-0.5 mt-1.5',
	indicator: [
		'relative flex size-8 shrink-0 items-center justify-center',
		'text-sm font-semibold',
		maru.roundedFull,
		'border border-transparent',
		'bg-transparent text-zinc-500',
		'dark:text-zinc-400',
		'border-zinc-950/10 dark:border-white/10',
		// focus (driven by parent step button)
		'group-focus-visible:outline-2 group-focus-visible:outline-blue-600 group-focus-visible:outline-offset-2',
	],
	title: {
		base: [
			'text-sm/5 font-medium',
			sumi.textMuted,
			'group-data-[state=current]:text-zinc-950 dark:group-data-[state=current]:text-white',
			'group-data-[clickable=true]:group-hover:text-zinc-950 dark:group-data-[clickable=true]:group-hover:text-white',
		],
		orientation: {
			horizontal: 'mt-2',
			vertical: '',
		},
	},
	description: ['text-xs/4', sumi.textMuted],
	separator: {
		base: 'shrink-0 bg-zinc-200 dark:bg-zinc-800',
		orientation: {
			horizontal: '-mx-12 mt-4 h-px min-w-6 flex-1 self-start',
			vertical: 'hidden',
		},
	},
	activeIndicator: [
		'flex items-center justify-center',
		'bg-blue-600 dark:bg-blue-600 text-white',
		'text-sm font-semibold',
	],
	defaults: { orientation: 'horizontal' as const },
}
