// Scrolls each current item into view in its own scroller, as `useNavItem` and
// `useTabListScroll` do at hydration, with the same 'nearest' rule: the least
// scroll that shows the whole item. A nav item scrolls
// in its nearest ancestor that scrolls and overflows on the vertical axis, and
// the walk stops at an ancestor that clips that axis, as `useScrollWithin` does.
// The walk also stops at the body, so the page itself never scrolls.
// A current tab scrolls in its `tab-list-scroll` viewport, on the axis of the
// list. The hooks then find each item in view, and they do not scroll again.
const SCRIPT = `(function(){function a(s,n,x){var r=n.getBoundingClientRect(),q=s.getBoundingClientRect(),l=x?r.left-q.left-s.clientLeft:r.top-q.top-s.clientTop,e=x?r.width:r.height,v=x?s.clientWidth:s.clientHeight,d=l<0?l:l+e>v?l-(v-e):0;if(!d)return;if(x)s.scrollLeft+=d;else s.scrollTop+=d}var c=document.querySelectorAll('[data-slot="sidebar-item-inner"][data-current],[data-slot="nav-item-inner"][data-current]'),i,n,s,y,t;for(i=0;i<c.length;i++){n=c[i].closest('[data-slot="sidebar-item"],[data-slot="nav-item"]');for(s=n&&n.parentElement;s&&s!==document.body;s=s.parentElement){y=getComputedStyle(s).overflowY;if((y==='auto'||y==='scroll'||y==='overlay')&&s.scrollHeight>s.clientHeight){a(s,n,0);break}if(y==='hidden'||y==='clip')break}}c=document.querySelectorAll('[data-slot="tab-list-scroll"]');for(i=0;i<c.length;i++){t=c[i].querySelector('[data-slot="tab"][data-current]');if(t)a(c[i],t,!c[i].querySelector(':scope>[aria-orientation="vertical"]'))}})()`

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
 * positions, so hydration finds the same markup.
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
	// biome-ignore lint/security/noDangerouslySetInnerHtml: a constant script with no user input.
	return <script id={id} dangerouslySetInnerHTML={{ __html: SCRIPT }} />
}
