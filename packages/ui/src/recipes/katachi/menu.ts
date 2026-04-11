import { kage } from '../kage'
import { narabi } from '../narabi'
import { sawari } from '../sawari'
import { sumi } from '../sumi'
import { take } from '../take'

export const menu = {
	content: ['w-max min-w-48', take.popup],
	item: [
		'group/option flex w-full items-center gap-3 px-3.5 py-2.5 sm:px-3 sm:py-1.5',
		...sawari.item,
		...narabi.item,
	],
	section: 'first:pt-0 last:pb-0',
	heading: [sumi.textMuted, 'px-3.5 pb-1 pt-2 text-xs/5 font-medium sm:px-3'],
	label: 'truncate',
	description: [sumi.textMuted, sawari.focusText, narabi.description],
	shortcut: 'ml-auto',
	separator: kage.divider,
}
