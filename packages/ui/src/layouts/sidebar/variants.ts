import { defineRecipe } from '../../core/recipe'
import { omote, sen, sou } from '../../recipes/kiso'

const { focus } = sen

// Below `lg`, the layout is in the flow and the page scrolls. A mobile browser
// moves the scroll offset of the page when its toolbar changes size, and only a
// page that can scroll takes that offset back. From `lg` up, the layout is
// pinned to the viewport box, and only the content region scrolls.
const layout = defineRecipe({
	base: [
		'relative min-h-svh overflow-x-clip',
		'lg:fixed lg:inset-0 lg:min-h-0 lg:overflow-hidden',
		'isolate',
		'flex max-lg:flex-col',
		'bg-white lg:bg-zinc-100',
		'dark:bg-zinc-950',
	],
})

// Sticks to the top of the page below `lg`, over the content that scrolls under it.
// The padding follows the nearest density scope.
const navbar = defineRecipe({
	base: ['sticky top-0 z-30', 'bg-white dark:bg-zinc-950', 'density-p-[4,6,8] lg:hidden'],
})

const panel = defineRecipe({
	base: [
		'shrink-0 min-w-0',
		'overflow-x-hidden overflow-y-auto',
		'max-lg:hidden',
		// A mini sidebar sets the rail width; the panel follows it instead of
		// holding the size step open.
		'has-data-[mini]:w-fit',
		// The rail holds text, so its width follows the nearest density scope, as the
		// text does. A container width has no stepped utility, so each step is a variant.
		'density-xs:w-2xs density-sm:w-2xs density-md:w-xs density-lg:w-sm density-xl:w-sm',
	],
})

const floatingHotZone = defineRecipe({
	base: ['absolute inset-y-0 start-0 z-30 w-2 max-lg:hidden'],
})

// Portaled to the body, so it escapes the layout's stacking context and needs a
// ladder rung rather than a local `z-30` like the hot zone above. It is the
// sidebar's own furniture, which is the `chrome` rung's other inhabitant.
const floatingBuffer = defineRecipe({
	base: [sou.chrome, 'fixed top-0 bottom-0 start-80 w-10 max-lg:hidden'],
})

const contentWrapper = defineRecipe({
	base: ['flex flex-col flex-1', 'lg:min-w-0 lg:py-2 lg:pe-2', 'lg:overflow-hidden'],
	floating: {
		true: 'lg:ps-2',
		false: '',
	},
	defaults: { floating: false },
})

const content = defineRecipe({
	base: [
		...omote.content,
		'flex flex-col',
		'lg:overflow-y-auto',
		'grow lg:min-h-0',
		'[&:has([data-slot=footer])>[data-slot=body]]:pb-0',
		// The padding follows the nearest density scope.
		'density-px-[4,6,8] density-pb-[4,6,8] lg:not-has-[[data-slot=header]]:density-pt-[4,6,8]',
	],
	stickyHeader: {
		true: [
			'**:data-[slot=header]:sticky',
			'**:data-[slot=header]:top-[var(--sidebar-navbar-height,0px)]',
			'**:data-[slot=header]:z-20',
			'**:data-[slot=header]:bg-white',
			'**:data-[slot=header]:dark:bg-zinc-950',
			'**:data-[slot=header]:dark:lg:bg-zinc-900',
		],
		false: '',
	},
	defaults: { stickyHeader: false },
})

// The padding follows the nearest density scope.
const header = defineRecipe({
	base: ['flex items-center shrink-0', 'lg:density-pt-[4,6,8] density-pb-[4,6,8]'],
})

const body = defineRecipe({
	base: ['flex-1 lg:min-h-0 lg:overflow-y-auto', focus.inset],
})

const footer = defineRecipe({ base: 'shrink-0' })

export const k = {
	layout,
	navbar,
	panel,
	floatingHotZone,
	floatingBuffer,
	contentWrapper,
	content,
	header,
	body,
	footer,
}
