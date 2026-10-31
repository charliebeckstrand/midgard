/**
 * Sidebar layout kata: the unit of `layouts/sidebar`. It is not the kata of the
 * Sidebar component (`kata/sidebar.ts`). The root slot `base` is the layout.
 * The other slots are its parts: the `navbar` of the drawer layout, the inline
 * `panel` and `aside`, the `actions`, the parts of the floating sidebar
 * (`floating.peek`, `floating.sheet`, `floating.body`, `floating.buffer`), the
 * `content` and its `content.wrapper`, the `header` and its `header.actions`,
 * the `body`, and the `footer`.
 */
import { defineKata } from '../../core/recipe'
import { dan, narabi, omote, sen, sou } from '../kiso'

const { flex } = narabi
const shows = narabi.offcanvas
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
// that changes with it has a table of the two values below, as a responsive
// axis, and the unit puts the prefix of each breakpoint on its classes.
//
// `100cqh` is the height of the nearest size container. With no size
// container, it is the height of the small viewport (`svh`). The layout thus
// fills the viewport in an app, and it fills its box in a demo.
//
// The layout takes the full width, so a parent that is a flex row does not
// shrink it to the width of its content.
const layout = ['relative w-full min-h-[100cqh]', 'isolate', 'flex', 'dark:bg-zinc-950']

// The width of the sidebar. It holds text, so its width follows the nearest
// density scope, as the text does. The inline panel and the body of the
// floating sheet both take it, so the text wraps the same in each.
const sidebarWidth = dan.size.sidebar.width

// Sticks to the top of the page in the drawer layout, over the content that scrolls under it.
// Keep the background opaque and the bar full width. Safari on iOS 26 then paints
// the color of the bar under the status bar. The padding follows the nearest
// density scope.
const navbar = ['sticky top-0 z-30', 'bg-white dark:bg-zinc-950', space.shell.base]

// The actions of the layout, in the navbar of the drawer layout and in the
// header of the inline layout. The gap between the actions follows the nearest density scope.
const actions = [flex.row, 'shrink-0', gap.default]

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
const panel = [
	...column,
	// The panel hides while the sidebar is offcanvas.
	'sidebar-offcanvas:hidden',
	// A mini sidebar sets the rail width; the panel follows it instead of
	// holding the size step open.
	'has-data-mini:w-fit',
	sidebarWidth,
]

// The hot zone shows in the inline layout while the sidebar is offcanvas.
const peek = ['absolute inset-y-0 start-0 z-30 w-2', 'hidden']

// The floating sidebar is a Sheet of `fit` width, and its body takes the width
// of the inline panel at each step.
const sheet = 'sm:top-0 sm:bottom-0'

const sheetBody = [flex.col, 'h-full', sidebarWidth]

// Portaled to the body, so it escapes the layout's stacking context and needs a
// ladder rung rather than a local `z-30` like the hot zone above
// (`floating.peek`). It is the sidebar's own furniture, which is the `chrome`
// rung's other inhabitant. It starts at the far edge of the floating sheet at
// each step.
const buffer = [sou.chrome, 'fixed top-0 bottom-0 w-10', dan.size.sidebar.edge]

// The content flows in the page. Do not give the content or this wrapper an
// overflow. That box then becomes the scroller of the sticky header, and the
// header does not stick to the top of the page.
// In the inline layout, while the sidebar is offcanvas, no panel is at the
// start edge, so the content takes a start gap too.
const wrapper = [flex.col, 'flex-1', 'min-w-0']

// The content block is flat in the drawer layout and a card in the inline
// layout (`content`). Each sets `--surface-fill`, which the sticky
// header reads.
const content = [
	flex.col,
	'grow',
	// The padding follows the nearest density scope.
	`${space.shell.x} ${space.shell.bottom}`,
]

// The padding follows the nearest density scope. A header with `stickyHeader`
// sticks in the inline layout only. In the drawer layout, the navbar
// is the one sticky bar of the page, and the header scrolls with the content.
// Two stacked sticky bars show a seam on iOS. The header takes these classes
// itself from its own layout, so a header in a nested layout does not stick.
const header = [flex.row, 'shrink-0', space.shell.bottom]

// The body grows into the free height of the content region, so the footer
// sits at the bottom of a short page. It scrolls with the page.
const body = ['flex-1', sen.focus.inset]

// The classes of each part that changes with the layout, for the drawer and
// the inline values, are the `layout` axis of the part. Each value of a table
// writes the same properties on the same selectors (CONVENTIONS §5.9). A part
// that only shows in one layout takes a table of `narabi.offcanvas`.
const top = { drawer: space.shell.top.none, inline: space.shell.top.inline } as const

export const k = defineKata({
	base: layout,
	responsive: { layout: { drawer: 'flex-col bg-white', inline: 'flex-row bg-zinc-100' } },
	slots: {
		navbar: { base: navbar, responsive: { layout: shows.drawer.block } },
		panel: { base: panel, responsive: { layout: shows.inline.block } },
		// The aside on the end edge. Its content takes its own width.
		aside: { base: column, responsive: { layout: shows.inline.block } },
		actions,
		floating: {
			slots: {
				peek: {
					base: peek,
					responsive: {
						layout: { drawer: 'sidebar-offcanvas:hidden', inline: 'sidebar-offcanvas:block' },
					},
				},
				sheet,
				body: sheetBody,
				buffer: { base: buffer, responsive: { layout: shows.inline.block } },
			},
		},
		content: {
			base: content,
			responsive: {
				layout: {
					drawer: `${omote.content.flat} not-has-[[data-slot=header]]:${top.drawer}`,
					inline: `${omote.content.card} not-has-[[data-slot=header]]:${top.inline}`,
				},
			},
			slots: {
				wrapper: {
					base: wrapper,
					responsive: {
						layout: {
							drawer: 'py-0 pe-0 sidebar-offcanvas:ps-0',
							inline: 'py-2 pe-2 sidebar-offcanvas:ps-2',
						},
					},
				},
			},
		},
		header: {
			base: header,
			responsive: { layout: top },
			/** A header with `stickyHeader` takes the fill of the content, over the content that scrolls under it. */
			stickyHeader: { true: ['top-0 z-20', 'bg-(--surface-fill)'], false: '' },
			compound: [
				{ stickyHeader: true, layout: 'drawer', class: 'static' },
				{ stickyHeader: true, layout: 'inline', class: 'sticky' },
			],
			slots: {
				/** The actions in the header, which show in the inline layout only. */
				actions: { base: actions, responsive: { layout: shows.inline.flex } },
			},
		},
		body,
		footer: 'shrink-0',
	},
})
