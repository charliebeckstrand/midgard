import { iro } from '../iro'
import { ji } from '../ji'
import { kumi } from '../kumi'
import { maru } from '../maru'
import { omote } from '../omote'
import { sen } from '../sen'

export const pdfViewer = {
	base: [
		'relative flex flex-col',
		'overflow-hidden',
		'h-[600px]',
		omote.surface,
		sen.border,
		maru.rounded.lg,
	],
	toolbar: [
		'flex items-center justify-between',
		kumi.gap.sm,
		'px-2 py-1.5',
		'border-b',
		sen.borderColor,
		'shrink-0',
	],
	toolbarSection: ['flex items-center', kumi.gap.sm, 'min-w-0'],
	pageStatus: [ji.size.sm, iro.text.muted, 'tabular-nums select-none whitespace-nowrap'],
	zoomLabel: [ji.size.sm, iro.text.muted, 'tabular-nums w-12 text-center select-none'],
	body: ['flex flex-1 min-h-0'],
	sidebar: ['hidden sm:flex flex-col', 'w-48 shrink-0', 'border-r', sen.borderColor],
	sidebarHeader: [
		'flex items-center',
		kumi.gap.sm,
		'px-3 py-2',
		ji.size.md,
		iro.text.muted,
		'font-semibold',
		// 'border-b',
		// sen.borderColor,
		'shrink-0',
		'select-none',
	],
	thumbnails: ['flex flex-col flex-1 min-h-0', kumi.gap.sm, 'overflow-y-auto px-3 pb-3'],
	thumbnailsGrid: ['grid grid-cols-2', kumi.gap.sm, 'p-3'],
	thumbnail: [
		'group/thumb',
		'flex flex-col items-center',
		kumi.gap.sm,
		'p-1.5',
		maru.rounded.lg,
		'bg-transparent',
		'cursor-pointer',
		'outline-none',
	],
	thumbnailFrame: [
		'block w-full aspect-[3/4]',
		'overflow-hidden',
		maru.rounded.lg,
		'bg-white dark:bg-zinc-950',
		'group-focus-visible/thumb:ring-4 group-focus-visible/thumb:ring-blue-600',
		'group-data-active/thumb:ring-4 group-data-active/thumb:ring-blue-600 dark:group-data-active/thumb:ring-blue-500',
	],
	thumbnailImage: ['block w-full h-full object-contain'],
	thumbnailFallback: ['flex h-full w-full', kumi.center, ji.size.sm, iro.text.muted],
	thumbnailLabel: [
		ji.size.xs,
		iro.text.muted,
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
	pageEmpty: ['flex w-full h-full', kumi.center, ji.size.sm, iro.text.muted],
}
