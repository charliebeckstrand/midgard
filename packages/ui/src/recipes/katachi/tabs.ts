import { mode } from '../../core/recipe/mode'
import { iro } from '../iro'
import { ki } from '../ki'
import { kumi } from '../kumi'
import { maru } from '../maru'
import { sawari } from '../sawari'
import { sen } from '../sen'
import { yasumi } from '../yasumi'

export const tabIndicator = mode('bg-zinc-950', 'dark:bg-white')

export const tabs = {
	list: ['flex gap-4', 'border-b', '-mt-4', sen.borderSubtleColor],
	tab: [
		'relative flex items-center',
		kumi.gap.md,
		'px-1 py-4',
		'font-medium',
		...iro.text.tab,
		ki.indicator,
		sawari.cursor,
		yasumi.disabled,
		'outline-none',
		'after:absolute after:inset-x-0 after:-bottom-px after:h-0.5 after:rounded-full',
		'after:bg-transparent',
		'focus-visible:after:bg-blue-500',
	],
	indicator: ['inset-x-0 -bottom-px top-auto h-0.5', maru.rounded.full, tabIndicator],
}
