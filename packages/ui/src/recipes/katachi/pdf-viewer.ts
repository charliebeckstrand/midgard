import { kage } from '../kage'
import { kumi } from '../kumi'
import { maru } from '../maru'
import { omote } from '../omote'
import { sumi } from '../sumi'
import { take } from '../take'

export const pdfViewer = {
	base: [
		'relative flex flex-col',
		'overflow-hidden',
		'h-[600px]',
		omote.surface,
		kage.border,
		maru.rounded,
	],
	toolbar: [
		'flex items-center justify-between',
		take.gap.sm,
		'px-2 py-1.5',
		'border-b',
		kage.borderColor,
		'shrink-0',
	],
	toolbarSection: ['flex items-center', take.gap.sm, 'min-w-0'],
	pageStatus: [take.text.sm, sumi.textMuted, 'tabular-nums select-none whitespace-nowrap'],
	zoomLabel: [take.text.sm, sumi.textMuted, 'tabular-nums w-12 text-center select-none'],
	body: ['flex flex-1 min-h-0'],
	sidebar: ['hidden sm:flex flex-col', 'w-48 shrink-0', 'border-r', kage.borderColor],
	sidebarHeader: [
		'flex items-center',
		take.gap.sm,
		'px-3 py-2',
		take.text.md,
		sumi.textMuted,
		'font-semibold',
		// 'border-b',
		// kage.borderColor,
		'shrink-0',
		'select-none',
	],
	thumbnails: ['flex flex-col', take.gap.sm, 'overflow-y-auto px-3 pb-3'],
	thumbnailsGrid: ['grid grid-cols-2', take.gap.sm, 'p-3'],
	thumbnail: [
		'group/thumb',
		'flex flex-col items-center',
		take.gap.sm,
		'p-1.5',
		maru.roundedMd,
		'bg-transparent',
		'cursor-pointer',
		'outline-none',
	],
	thumbnailFrame: [
		'block w-full aspect-[3/4]',
		'overflow-hidden',
		maru.rounded,
		'bg-white dark:bg-zinc-950',
		'group-focus-visible/thumb:ring-4 group-focus-visible/thumb:ring-blue-600',
		'group-data-active/thumb:ring-4 group-data-active/thumb:ring-blue-600 dark:group-data-active/thumb:ring-blue-500',
	],
	thumbnailImage: ['block w-full h-full object-contain'],
	thumbnailFallback: ['flex h-full w-full', kumi.center, take.text.sm, sumi.textMuted],
	thumbnailLabel: [
		take.text.xs,
		sumi.textMuted,
		'group-data-active/thumb:text-blue-600 dark:group-data-active/thumb:text-blue-500',
		'tabular-nums select-none',
	],
	viewport: [
		'flex-1 min-w-0',
		'overflow-auto',
		'bg-zinc-100 dark:bg-zinc-900',
		'flex',
		kumi.center,
		'p-6',
	],
	pageFrame: ['relative shrink-0'],
	page: ['absolute top-1/2 left-1/2 origin-center', 'shadow-lg', 'bg-white'],
	pageEmpty: ['flex w-full h-full', kumi.center, take.text.sm, sumi.textMuted],
}
