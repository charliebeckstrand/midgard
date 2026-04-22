import { iro } from '../iro'
import { ji } from '../ji'
import { kumi } from '../kumi'
import { maru } from '../maru'
import { omote } from '../omote'
import { sen } from '../sen'

export const pdfViewer = {
	base: ['relative flex flex-col', 'overflow-hidden', omote.surface, sen.border, maru.rounded.xl],
	toolbar: [
		'flex flex-nowrap items-center justify-between',
		'overflow-x-auto',
		kumi.gap.sm,
		'px-2 py-1.5',
		'border-b',
		sen.borderColor,
		'shrink-0',
	],
	toolbarSection: ['flex items-center shrink-0', kumi.gap.sm],
	pageStatus: [ji.size.sm, iro.text.muted, 'tabular-nums select-none whitespace-nowrap'],
	body: ['flex flex-1 min-h-0'],
	sidebar: [
		'flex flex-col shrink-0 w-56 min-h-0',
		'overflow-hidden',
		'border-r',
		sen.borderColor,
		'transition-[margin] duration-150 ease-in-out',
	],
	sidebarClosed: '-ml-56',
	sidebarHeader: [
		'flex items-center',
		kumi.gap.sm,
		'px-3 py-2',
		ji.size.md,
		iro.text.muted,
		'font-semibold',
		'shrink-0',
		'select-none',
	],
	thumbnails: [
		'flex flex-col basis-0 grow shrink min-h-0',
		kumi.gap.md,
		'overflow-y-auto px-4 pb-4',
	],
	thumbnailsGrid: ['grid grid-cols-2', kumi.gap.md, 'sm:p-3'],
	thumbnail: [
		'group/thumb',
		'flex flex-col items-center',
		kumi.gap.md,
		maru.rounded.lg,
		'bg-transparent',
		'cursor-pointer',
		'outline-none',
	],
	thumbnailFrame: [
		'relative block w-full aspect-[3/4]',
		'overflow-hidden',
		maru.rounded.lg,
		'bg-white dark:bg-zinc-950',
		'opacity-50',
		'after:pointer-events-none after:absolute after:inset-0 after:rounded-lg after:ring-inset',
		'group-focus-visible/thumb:after:ring-4 group-focus-visible/thumb:after:ring-blue-600',
		'group-data-active/thumb:opacity-100 dark:group-data-active/thumb:opacity-100',
	],
	thumbnailImage: ['block w-full h-full object-contain'],
	thumbnailFallback: ['flex h-full w-full', kumi.center, ji.size.sm, iro.text.muted],
	thumbnailLabel: [
		ji.size.sm,
		iro.text.muted,
		'group-data-active/thumb:text-zinc-950 dark:group-data-active/thumb:text-white',
		'tabular-nums select-none',
	],
	viewport: [
		'flex-1 min-w-0',
		'max-h-[min(1280px)]',
		'overflow-auto',
		'bg-zinc-100 dark:bg-zinc-900',
		'flex items-safe-center justify-safe-center',
		'p-4',
	],
	pageFrame: ['relative shrink-0'],
	page: ['absolute top-1/2 left-1/2 origin-center', 'shadow-lg', 'bg-white'],
	pageEmpty: ['flex w-full h-full', kumi.center, ji.size.sm, iro.text.muted],
}
