import { iro } from '../iro'
import { ji } from '../ji'
import { kumi } from '../kumi'
import { maru } from '../maru'
import { sen } from '../sen'
import { ugoki } from '../ugoki'

export const tree = {
	base: ['flex flex-col', kumi.gap.xs],
	itemContent: [
		'flex w-full items-center',
		'py-1 px-2',
		ji.size.sm,
		kumi.gap[1.5],
		iro.text.muted,
		iro.text.hover,
		maru.rounded.lg,
		sen.focus.inset,
		'cursor-pointer',
		'data-[open]:text-zinc-950 dark:data-[open]:text-white',
	],
	itemContentActive: iro.text.default,
	chevron: ['flex-none', ugoki.css.transform, ugoki.css.duration],
	label: 'flex-1 truncate text-left',
	group: 'overflow-hidden',
}
