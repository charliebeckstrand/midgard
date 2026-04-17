import { kage } from '../kage'
import { ki } from '../ki'
import { maru } from '../maru'
import { nuri } from '../nuri'
import { sawari } from '../sawari'
import { sumi } from '../sumi'
import { yasumi } from '../yasumi'

export const tabs = {
	list: ['flex gap-4', 'border-b', '-mt-4', kage.borderSubtleColor],
	tab: [
		'relative flex items-center gap-2',
		'px-1 py-4',
		'font-medium',
		...sumi.tab,
		ki.indicator,
		sawari.cursor,
		yasumi.disabled,
		'outline-none',
		'after:absolute after:inset-x-0 after:-bottom-px after:h-0.5 after:rounded-full',
		'after:bg-transparent',
		'focus-visible:after:bg-blue-500',
	],
	indicator: ['inset-x-0 -bottom-px top-auto h-0.5', maru.roundedFull, nuri.tabIndicator],
}
