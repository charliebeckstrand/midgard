/**
 * Sidebar layout kata: the recipes of `layouts/sidebar`. It is not the kata of
 * the Sidebar component (`kata/sidebar.ts`).
 */
import { defineRecipe } from '../../core/recipe'
import { omote, sen, sou } from '../kiso'
import { dan } from '../kiso/dan'

const { space } = dan

// The layout is in the flow, and the page scrolls at each width. A mobile
// browser moves the scroll offset of the page when its toolbar changes size,
// and only a page that can scroll takes that offset back. The scroll
// restoration of a router also reads and sets the scroll position of the page.
//
// Below `lg`, do not clip the overflow of the layout. WebKit then gives the
// sticky navbar an ancestor clipping layer, and on iOS the bar stutters while
// the page scrolls (WebKit bug 247130). From `lg` up, the sticky header and the
// sticky panel need the same rule, so no width clips the layout.
//
// `100cqh` is the height of the nearest size container. With no size
// container, it is the height of the small viewport (`svh`). The layout thus
// fills the viewport in an app, and it fills its box in a demo.
//
// The layout takes the full width, so a parent that is a flex row does not
// shrink it to the width of its content.
const layout = defineRecipe({
	base: [
		'relative w-full min-h-[100cqh]',
		'isolate',
		'flex max-lg:flex-col',
		'bg-white lg:bg-zinc-100',
		'dark:bg-zinc-950',
	],
})

// The width of the sidebar. It holds text, so its width follows the nearest
// density scope, as the text does. A container width has no stepped utility, so
// the steps are variants, and equal steps share one. The inline panel and the
// body of the floating sheet both take it, so the text wraps the same in each.
const sidebarWidth = 'density-[xs,sm]:w-2xs density-md:w-xs density-[lg,xl]:w-sm'

// Sticks to the top of the page below `lg`, over the content that scrolls under it.
// Keep the background opaque and the bar full width. Safari on iOS 26 then paints
// the color of the bar under the status bar. The padding follows the nearest
// density scope.
const navbar = defineRecipe({
	base: ['sticky top-0 z-30', 'bg-white dark:bg-zinc-950', `${space.shell} lg:hidden`],
})

// From `lg` up, the panel sticks to the top of the page. It is as tall as the
// layout at its minimum (`100cqh`), and it scrolls on its own. A long sidebar
// thus does not scroll with the page. A scroll that reaches the end of the
// panel stops there and does not move on to the page (`overscroll-contain`).
const panel = defineRecipe({
	base: [
		'shrink-0 min-w-0',
		'lg:sticky lg:top-0 lg:h-[100cqh] lg:overscroll-contain',
		'overflow-x-hidden overflow-y-auto',
		'max-lg:hidden',
		// A mini sidebar sets the rail width; the panel follows it instead of
		// holding the size step open.
		'has-data-[mini]:w-fit',
		sidebarWidth,
	],
})

const floatingHotZone = defineRecipe({
	base: ['absolute inset-y-0 start-0 z-30 w-2 max-lg:hidden'],
})

// The floating sidebar is a Sheet of `fit` width, and its body takes the width
// of the inline panel at each step.
const floatingSheet = defineRecipe({ base: 'sm:top-0 sm:bottom-0' })

const floatingBody = defineRecipe({ base: ['flex flex-col h-full', sidebarWidth] })

// Portaled to the body, so it escapes the layout's stacking context and needs a
// ladder rung rather than a local `z-30` like the hot zone above. It is the
// sidebar's own furniture, which is the `chrome` rung's other inhabitant. It
// starts at the far edge of the floating sheet at each step.
const floatingBuffer = defineRecipe({
	base: [
		sou.chrome,
		'fixed top-0 bottom-0 w-10 max-lg:hidden',
		'density-[xs,sm]:start-72 density-md:start-80 density-[lg,xl]:start-96',
	],
})

// The content flows in the page. Do not give the content or this wrapper an
// overflow. That box then becomes the scroller of the sticky header, and the
// header does not stick to the top of the page.
const contentWrapper = defineRecipe({
	base: ['flex flex-col flex-1', 'lg:min-w-0 lg:py-2 lg:pe-2'],
	floating: {
		true: 'lg:ps-2',
		false: '',
	},
	defaults: { floating: false },
})

const content = defineRecipe({
	base: [
		...omote.content,
		'flex flex-col grow',
		'[&:has([data-slot=footer])>[data-slot=body]]:pb-0',
		// The padding follows the nearest density scope.
		`${space.shellX} ${space.shellBottom} ${space.shellTopNoHeader}`,
	],
	// From `lg` up only, where the header sticks to the top of the page. Below `lg`,
	// the navbar is the one sticky bar of the page, and the header scrolls with the
	// content. Two stacked sticky bars show a seam on iOS.
	stickyHeader: {
		true: [
			'**:data-[slot=header]:lg:sticky',
			'**:data-[slot=header]:lg:top-0',
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
	base: ['flex items-center shrink-0', `${space.shellTopLarge} ${space.shellBottom}`],
})

// The body grows into the free height of the content region, so the footer
// sits at the bottom of a short page. It scrolls with the page.
const body = defineRecipe({
	base: ['flex-1', sen.focus.inset],
})

const footer = defineRecipe({ base: 'shrink-0' })

export const k = {
	layout,
	navbar,
	panel,
	floatingHotZone,
	floatingSheet,
	floatingBody,
	floatingBuffer,
	contentWrapper,
	content,
	header,
	body,
	footer,
}
