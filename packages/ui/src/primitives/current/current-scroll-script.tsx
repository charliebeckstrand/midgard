import { InlineScript } from '../inline-script/inline-script'

// Scrolls each current item into view in its own scroller. A nav item and a
// tab take the 'nearest' rule of `useNavItem` and `useTabListScroll`: the least
// scroll that shows the whole item. A sidebar item goes to the top of its
// scroller, as the CSS of the item puts it (`kata/sidebar.ts`). When the item is
// the first of its section, the section goes to the top, so its label shows.
// A nav item or a sidebar item scrolls
// in its nearest ancestor that scrolls and overflows on the vertical axis, and
// the walk stops at an ancestor that clips that axis, as `useScrollWithin` does.
// The walk also stops at the body, so the page itself never scrolls.
// A browser with `scroll-initial-target` puts a current sidebar item in view
// with the CSS of the item, so the script skips the sidebar items there.
// A current tab scrolls in its `tab-list-scroll` viewport, on the axis of the
// list. The hooks then find each item in view, and they do not scroll again.
const SCRIPT = `(function(){function a(s,n,x){var r=n.getBoundingClientRect(),q=s.getBoundingClientRect(),l=x?r.left-q.left-s.clientLeft:r.top-q.top-s.clientTop,e=x?r.width:r.height,v=x?s.clientWidth:s.clientHeight,d=l<0?l:l+e>v?l-(v-e):0;if(!d)return;if(x)s.scrollLeft+=d;else s.scrollTop+=d}var c=document.querySelectorAll((CSS.supports('scroll-initial-target','nearest')?'':'[data-slot="sidebar-item-inner"][data-current],')+'[data-slot="nav-item-inner"][data-current]'),i,n,m,s,y,t;for(i=0;i<c.length;i++){n=c[i].closest('[data-slot="sidebar-item"],[data-slot="nav-item"]');m=null;if(n&&n.getAttribute('data-slot')==='sidebar-item'){t=n.closest('[data-slot="sidebar-section"]');m=t&&t.querySelector('[data-slot="sidebar-item"]')===n?t:n}for(s=n&&n.parentElement;s&&s!==document.body;s=s.parentElement){y=getComputedStyle(s).overflowY;if((y==='auto'||y==='scroll'||y==='overlay')&&s.scrollHeight>s.clientHeight){if(m)s.scrollTop+=m.getBoundingClientRect().top-s.getBoundingClientRect().top-s.clientTop;else a(s,n,0);break}if(y==='hidden'||y==='clip')break}}c=document.querySelectorAll('[data-slot="tab-list-scroll"]');for(i=0;i<c.length;i++){t=c[i].querySelector('[data-slot="tab"][data-current]');if(t)a(c[i],t,!c[i].querySelector(':scope>[aria-orientation="vertical"]'))}})()`

/** Props of {@link CurrentScrollScript}. */
export type CurrentScrollScriptProps = {
	/**
	 * The `id` of the script element. A render-blocking
	 * `<link rel="expect" href="#id" blocking="render">` that names it holds the
	 * first paint until the script has run.
	 */
	id?: string
}

/**
 * Inline script that scrolls each current nav item, sidebar item, and tab into
 * view in its own scroller before the first paint. Without it, a
 * server-rendered list paints at the start of its scroller, and the item
 * scrolls into view after hydration. Render it in the body of a
 * server-rendered app, after the lists. The script changes only scroll
 * positions, so hydration finds the same markup. A browser with
 * `scroll-initial-target` puts a current sidebar item in view with the CSS of
 * `SidebarItem`, so there the script skips the sidebar items. A current
 * sidebar item goes to the top of its scroller, with the label of its section
 * when it is the first item of the section.
 *
 * It has no `'use client'` and reads no context, so a server layout can render
 * it.
 *
 * @example
 * ```tsx
 * <body>
 * 	{children}
 * 	<CurrentScrollScript />
 * </body>
 * ```
 */
export function CurrentScrollScript({ id }: CurrentScrollScriptProps) {
	return <InlineScript id={id} source={SCRIPT} />
}
