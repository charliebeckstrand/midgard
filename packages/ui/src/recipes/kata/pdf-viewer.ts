/**
 * PDF-viewer kata: object-literal surface for the `<PdfViewer>` chrome. No
 * variants axis — nested slot groups for the `toolbar`, the collapsible
 * `sidebar`, the `thumbnails` rail and each `thumbnail`, and the `viewport`
 * with its per-`page` frame and skeleton placeholders.
 */
import { mode } from '../../core/recipe'
import { hannou, iro, ji, narabi, omote, sen } from '../kiso'

const { cursor } = hannou
const { text } = iro
const { size, weight } = ji
const { flex } = narabi
const { bg, skeleton } = omote
const { border } = sen

export const k = {
	base: ['relative', flex.col, 'overflow-hidden', bg.surface, border.default],
	body: ['flex flex-1 min-h-0'],
	toolbar: {
		base: [
			'flex flex-nowrap items-center justify-between',
			'overflow-x-auto',
			'gap-1',
			'px-2 py-1.5',
			'border-b',
			border.defaultColor,
			'shrink-0',
		],
		section: [flex.row, 'shrink-0', 'gap-1'],
		pageStatus: [size.sm, text.muted, 'tabular-nums select-none whitespace-nowrap'],
	},
	sidebar: {
		base: [
			flex.col,
			'shrink-0 w-56 min-h-0',
			'overflow-hidden',
			'border-r',
			border.defaultColor,
			'transition-[margin] duration-150 ease-in-out',
		],
		closed: '-ml-56',
		header: [
			flex.row,
			'gap-1',
			'px-3 py-2',
			size.md,
			text.muted,
			weight.semibold,
			'shrink-0',
			'select-none',
		],
	},
	thumbnails: {
		base: [flex.col, 'basis-0 grow shrink min-h-0', 'gap-2', 'overflow-y-auto px-4 pb-4'],
		grid: ['grid grid-cols-2', 'gap-2'],
	},
	thumbnail: {
		base: [
			'group/thumb',
			flex.col,
			'items-center',
			'gap-2',
			'bg-transparent',
			'outline-none',
			...cursor,
		],
		frame: [
			'relative block w-full aspect-[3/4]',
			'overflow-hidden',
			'opacity-50',
			'after:pointer-events-none after:absolute after:inset-0 after:ring-inset',
			'group-focus-visible/thumb:after:ring-4',
			'group-focus-visible/thumb:after:ring-blue-600',
			'group-focus-visible/thumb:opacity-75',
			'group-data-current/thumb:opacity-100',
			'group-hover/thumb:opacity-75',
			'group-data-current/thumb:hover:opacity-100',
		],
		image: ['block w-full h-full object-contain'],
		fallback: [flex.row, 'justify-center', 'h-full w-full', size.sm, text.muted],
		placeholder: ['block w-full aspect-[3/4]', skeleton],
		label: [
			size.sm,
			text.muted,
			...mode('group-data-current/thumb:text-zinc-950', 'dark:group-data-current/thumb:text-white'),
			'tabular-nums select-none',
		],
	},
	viewport: {
		base: [
			'overflow-auto',
			'flex items-safe-center justify-safe-center',
			'flex-1 min-w-0',
			'max-h-[1280px]',
			'box-content p-4',
			...mode('bg-zinc-100', 'dark:bg-zinc-900'),
		],
		page: {
			frame: ['relative shrink-0'],
			base: ['absolute top-1/2 left-1/2 origin-center', 'shadow-lg', 'bg-white'],
			placeholder: ['w-full h-full', skeleton],
			empty: [flex.row, 'justify-center', 'w-full h-full', 'py-2', text.muted],
		},
	},
} as const
