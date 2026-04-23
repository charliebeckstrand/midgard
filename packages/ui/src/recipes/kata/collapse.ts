import { iro } from '../iro'
import { ji } from '../ji'
import { kumi } from '../kumi'
import { sen } from '../sen'

export const collapse = {
	base: 'group/collapse',
	trigger: [
		'inline-flex items-center',
		kumi.gap.sm,
		ji.size.sm,
		iro.text.muted,
		iro.text.hover,
		'font-medium',
		'group-data-[open]/collapse:text-zinc-950',
		'dark:group-data-[open]/collapse:text-white',
		sen.focus.ring,
		'disabled:opacity-50 disabled:cursor-not-allowed',
		'cursor-pointer',
	],
	panel: 'overflow-hidden',
}
