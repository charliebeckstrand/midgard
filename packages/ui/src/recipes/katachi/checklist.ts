import { kage } from '../kage'
import { maru } from '../maru'
import { sumi } from '../sumi'
import { take } from '../take'

export const checklist = {
	base: ['flex flex-col', take.gap.md],
	header: ['flex flex-col', take.gap.sm],
	heading: ['flex items-center justify-between', take.gap.md],
	title: ['font-semibold', take.text.md, ...sumi.text],
	description: [take.text.sm, ...sumi.textMuted],
	summary: [take.text.sm, ...sumi.textMuted, 'font-medium tabular-nums whitespace-nowrap'],
	list: ['flex flex-col divide-y', kage.borderSubtleColor],
	item: ['group/checklist-item', 'flex items-start', take.gap.md, 'py-3'],
	indicator: [
		'mt-0.5 inline-flex items-center justify-center shrink-0',
		'size-5',
		maru.roundedFull,
		'border border-zinc-300 dark:border-zinc-600',
		'text-transparent',
		'group-data-[complete=true]/checklist-item:border-transparent',
		'group-data-[complete=true]/checklist-item:bg-blue-600',
		'group-data-[complete=true]/checklist-item:text-white',
		'dark:group-data-[complete=true]/checklist-item:bg-blue-500',
	],
	content: ['flex flex-col flex-1 min-w-0', take.gap.sm],
	itemTitle: [
		take.text.sm,
		...sumi.text,
		'font-medium',
		'group-data-[complete=true]/checklist-item:line-through',
		'group-data-[complete=true]/checklist-item:text-zinc-500',
		'dark:group-data-[complete=true]/checklist-item:text-zinc-500',
	],
	itemDescription: [take.text.sm, ...sumi.textMuted],
	actions: ['shrink-0 flex items-center', take.gap.sm],
}
