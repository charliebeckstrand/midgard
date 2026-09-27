import { defineRecipe } from '../../core/recipe'
import { omote, sen, sou } from '../../recipes/kiso'

const { focus } = sen

// Pinned to the viewport box, not sized by a viewport unit. On iOS an `svh` height
// can be out of date on the first load, and a layout in the flow gives the page
// a height it can scroll. A pinned layout gives the page no height to scroll.
const layout = defineRecipe({
	base: [
		'fixed inset-0 isolate',
		'flex max-lg:flex-col',
		'bg-white lg:bg-zinc-100',
		'dark:bg-zinc-950',
		'overflow-hidden',
	],
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
	base: ['flex flex-col flex-1', 'lg:min-w-0 lg:py-2 lg:pe-2', 'overflow-hidden'],
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
		'overflow-y-auto',
		'grow min-h-0',
		'[&:has([data-slot=footer])>[data-slot=body]]:pb-0',
		// The padding follows the nearest density scope.
		'density-px-[4,6,8] density-pb-[4,6,8] lg:not-has-[[data-slot=header]]:density-pt-[4,6,8]',
	],
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
	defaults: { stickyHeader: false },
})

// The padding follows the nearest density scope.
const header = defineRecipe({
	base: ['flex items-center shrink-0', 'lg:density-pt-[4,6,8] density-pb-[4,6,8]'],
})

const body = defineRecipe({
	base: ['flex-1 min-h-0 overflow-y-auto', focus.inset],
})

const footer = defineRecipe({ base: 'shrink-0' })

export const k = {
	layout,
	panel,
	floatingHotZone,
	floatingBuffer,
	contentWrapper,
	content,
	header,
	body,
	footer,
}
