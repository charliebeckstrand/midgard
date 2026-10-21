/**
 * Sidebar layout kata: the recipes of `layouts/sidebar`. It is not the kata of
 * the Sidebar component (`kata/sidebar.ts`).
 */
import { defineRecipe } from '../../core/recipe'
import { dan, narabi, omote, sen, sou } from '../kiso'
import type { ByLayout } from './offcanvas'

const { flex } = narabi
const { gap, space } = dan

// The layout is in the flow, and the page scrolls at each width. A mobile
// browser moves the scroll offset of the page when its toolbar changes size,
// and only a page that can scroll takes that offset back. The scroll
// restoration of a router also reads and sets the scroll position of the page.
//
// Do not clip the overflow of the layout. In the drawer layout, WebKit then
// gives the sticky navbar an ancestor clipping layer, and on iOS the bar
// stutters while the page scrolls (WebKit bug 247130). In the inline layout,
// the sticky header and the sticky panel need the same rule, so no layout
// clips.
//
// The layout is a drawer or inline at each breakpoint (`layout`). Each part
// that changes with it has a table of the two values below (`k.layout`), and
// `resolveVariant` puts the prefix of each breakpoint on its classes.
//
// `100cqh` is the height of the nearest size container. With no size
// container, it is the height of the small viewport (`svh`). The layout thus
// fills the viewport in an app, and it fills its box in a demo.
//
// The layout takes the full width, so a parent that is a flex row does not
// shrink it to the width of its content.
const layout = defineRecipe({
	base: ['relative w-full min-h-[100cqh]', 'isolate', 'flex', 'dark:bg-zinc-950'],
})

// The width of the sidebar. It holds text, so its width follows the nearest
// density scope, as the text does. The inline panel and the body of the
// floating sheet both take it, so the text wraps the same in each.
const sidebarWidth = dan.size.sidebar.width

// Sticks to the top of the page in the drawer layout, over the content that scrolls under it.
// Keep the background opaque and the bar full width. Safari on iOS 26 then paints
// the color of the bar under the status bar. The padding follows the nearest
// density scope.
const navbar = defineRecipe({
	base: ['sticky top-0 z-30', 'bg-white dark:bg-zinc-950', space.shell.base],
})

// The actions of the layout, in the navbar of the drawer layout and in the
// header of the inline layout. The gap between the actions follows the nearest density scope.
const actions = defineRecipe({
	base: ['flex items-center shrink-0', gap.default],
})

// The column of the panel and of the aside, which show in the inline layout
// only. It sticks to the top of the page. It is as tall as the layout at its
// minimum (`100cqh`), and it scrolls on its own. A long sidebar thus does not
// scroll with the page. A scroll that reaches the end of the column stops there
// and does not move on to the page (`overscroll-contain`).
const column = [
	'shrink-0 min-w-0',
	'sticky top-0 h-[100cqh] overscroll-contain',
	'overflow-x-hidden overflow-y-auto',
]

// The panel on the start edge holds the sidebar.
const panel = defineRecipe({
	base: [
		...column,
		// The panel hides while the sidebar is offcanvas.
		'sidebar-offcanvas:hidden',
		// A mini sidebar sets the rail width; the panel follows it instead of
		// holding the size step open.
		'has-data-mini:w-fit',
		sidebarWidth,
	],
})

// The aside on the end edge. Its content takes its own width.
const aside = defineRecipe({ base: column })

// The hot zone shows in the inline layout while the sidebar is offcanvas.
const floatingHotZone = defineRecipe({
	base: ['absolute inset-y-0 start-0 z-30 w-2', 'hidden'],
})

// The floating sidebar is a Sheet of `fit` width, and its body takes the width
// of the inline panel at each step.
const floatingSheet = defineRecipe({ base: 'sm:top-0 sm:bottom-0' })

const floatingBody = defineRecipe({ base: [flex.col, 'h-full', sidebarWidth] })

// Portaled to the body, so it escapes the layout's stacking context and needs a
// ladder rung rather than a local `z-30` like the hot zone above
// (`floating.peek`). It is the sidebar's own furniture, which is the `chrome`
// rung's other inhabitant. It starts at the far edge of the floating sheet at
// each step.
const floatingBuffer = defineRecipe({
	base: [sou.chrome, 'fixed top-0 bottom-0 w-10', dan.size.sidebar.edge],
})

// The content flows in the page. Do not give the content or this wrapper an
// overflow. That box then becomes the scroller of the sticky header, and the
// header does not stick to the top of the page.
// In the inline layout, while the sidebar is offcanvas, no panel is at the
// start edge, so the content takes a start gap too.
const contentWrapper = defineRecipe({
	base: [flex.col, 'flex-1', 'min-w-0'],
})

// The content block is flat in the drawer layout and a card in the inline
// layout (`k.layout.content`). Each sets `--surface-fill`, which the sticky
// header reads.
const content = defineRecipe({
	base: [
		flex.col,
		'grow',
		// The padding follows the nearest density scope.
		`${space.shell.x} ${space.shell.bottom}`,
	],
})

// The padding follows the nearest density scope. The header sticks in the
// inline layout only (`k.layout.stickyHeader`). In the drawer layout, the navbar
// is the one sticky bar of the page, and the header scrolls with the content.
// Two stacked sticky bars show a seam on iOS. The header takes these classes
// itself from its own layout, so a header in a nested layout does not stick.
const header = defineRecipe({
	base: ['flex items-center shrink-0', space.shell.bottom],
	stickyHeader: {
		true: ['top-0 z-20', 'bg-(--surface-fill)'],
		false: '',
	},
	defaults: { stickyHeader: false },
})

// The body grows into the free height of the content region, so the footer
// sits at the bottom of a short page. It scrolls with the page.
const body = defineRecipe({
	base: ['flex-1', sen.focus.inset],
})

const footer = defineRecipe({ base: 'shrink-0' })

// The classes of each part that changes with the layout, for the drawer and
// the inline values. Each value of a table writes the same properties on the
// same selectors (CONVENTIONS §5.9). A part that only shows in one layout takes
// a table of `kata/offcanvas.ts`.
const top = { drawer: space.shell.top.none, inline: space.shell.top.inline } as const

const byLayout = {
	base: { drawer: 'flex-col bg-white', inline: 'flex-row bg-zinc-100' },
	peek: { drawer: 'sidebar-offcanvas:hidden', inline: 'sidebar-offcanvas:block' },
	wrapper: {
		drawer: 'py-0 pe-0 sidebar-offcanvas:ps-0',
		inline: 'py-2 pe-2 sidebar-offcanvas:ps-2',
	},
	content: {
		drawer: `${omote.content.flat} not-has-[[data-slot=header]]:${top.drawer}`,
		inline: `${omote.content.card} not-has-[[data-slot=header]]:${top.inline}`,
	},
	stickyHeader: { drawer: 'static', inline: 'sticky' },
	header: top,
} as const satisfies Record<string, ByLayout>

export const k = {
	base: layout,
	layout: byLayout,
	navbar,
	panel,
	aside,
	actions,
	// The parts of the floating sidebar: the `peek` hot zone at the start edge,
	// the `sheet`, its `body`, and the `buffer` at the far edge of the sheet.
	floating: {
		peek: floatingHotZone,
		sheet: floatingSheet,
		body: floatingBody,
		buffer: floatingBuffer,
	},
	content: {
		base: content,
		wrapper: contentWrapper,
	},
	header,
	body,
	footer,
}
