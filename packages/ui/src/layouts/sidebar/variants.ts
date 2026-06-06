import { defineRecipe } from '../../core/recipe'
import { omote } from '../../recipes/kiso'

const layout = defineRecipe({
	base: [
		'relative isolate',
		'h-svh w-full max-lg:flex-col',
		'bg-white lg:bg-zinc-100',
		'dark:bg-zinc-950',
		'overflow-hidden',
	],
})

const panel = defineRecipe({
	base: ['shrink-0 min-w-0', 'overflow-x-hidden overflow-y-auto', 'max-lg:hidden'],
	size: {
		sm: 'w-2xs',
		md: 'w-xs',
		lg: 'w-sm',
	},
	defaults: { size: 'md' },
})

const floatingHotZone = defineRecipe({
	base: ['absolute inset-y-0 left-0 z-30 w-2 max-lg:hidden'],
})

const contentWrapper = defineRecipe({
	base: ['flex-1', 'lg:min-w-0 lg:py-2 lg:pr-2', 'overflow-hidden'],
	floating: {
		true: 'lg:pl-2',
		false: '',
	},
	defaults: { floating: false },
})

const content = defineRecipe({
	base: [
		...omote.content,
		'overflow-y-auto',
		'grow min-h-0',
		'[&:has([data-slot=footer])>[data-slot=body]]:pb-0',
	],
	size: {
		sm: 'px-4 pb-4 lg:not-has-[[data-slot=header]]:pt-4',
		md: 'px-6 pb-6 lg:not-has-[[data-slot=header]]:pt-6',
		lg: 'px-8 pb-8 lg:not-has-[[data-slot=header]]:pt-8',
	},
	stickyHeader: {
		true: [
			'**:data-[slot=header]:sticky',
			'**:data-[slot=header]:top-0',
			'**:data-[slot=header]:z-20',
			'**:data-[slot=header]:bg-white',
			'**:data-[slot=header]:dark:bg-zinc-950',
			'**:data-[slot=header]:dark:lg:bg-zinc-900',
		],
		false: '',
	},
	defaults: { size: 'md', stickyHeader: false },
})

const header = defineRecipe({
	base: ['flex items-center shrink-0'],
	size: {
		sm: 'lg:pt-4 pb-4',
		md: 'lg:pt-6 pb-6',
		lg: 'lg:pt-8 pb-8',
	},
	defaults: { size: 'md' },
})

const body = defineRecipe({ base: 'flex-1 min-h-0 overflow-y-auto' })

const footer = defineRecipe({ base: 'shrink-0' })

export const k = {
	layout,
	panel,
	floatingHotZone,
	contentWrapper,
	content,
	header,
	body,
	footer,
}
