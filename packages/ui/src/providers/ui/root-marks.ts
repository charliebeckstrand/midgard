import { eventsRootAttributes } from '../../modules/events/engine/events-setting'
import { appearanceRootClasses } from '../appearance/appearance-root'

/**
 * The marks that the stored settings of the reader put on the root element of
 * a page: its classes and its attributes.
 */
export type RootMarks = {
	/** The classes of the appearance: the theme, the density, the motion, and the sidebar. */
	classes: readonly string[]
	/** The attributes of the events: whether they run, and whether the panel is pinned. */
	attributes: readonly string[]
}

/**
 * The marks of the root element for `cookies`, the `Cookie` header of a
 * request. `AppearanceProvider` and the events keep a copy of each setting in
 * a cookie, so a server can read the settings. With no cookies, there are no
 * marks.
 *
 * @remarks Server only. The first paint of a page takes the settings of the
 * reader only when the server writes the marks on `<html>` with
 * {@link markRoot}. The docs server and the server of each app do this, so ui
 * has no script before the paint (CONVENTIONS §3.13).
 */
export function rootMarks(cookies = ''): RootMarks {
	return { classes: appearanceRootClasses(cookies), attributes: eventsRootAttributes(cookies) }
}

/** The `class` attribute in the attributes of a tag, and its value. */
const CLASS_ATTRIBUTE = /\sclass="([^"]*)"/

/** The opening tag of the root element. */
const ROOT_TAG = /<html\b([^>]*)>/

/**
 * Whether `html` holds the whole opening tag of the root element, so
 * {@link markRoot} can mark it. A server that streams a page reads the start
 * of the page until this is true.
 */
export function hasRootTag(html: string): boolean {
	return ROOT_TAG.test(html)
}

/**
 * The HTML of a page with `marks` on its root element: the classes go after
 * the classes of the page, and each attribute has no value. HTML with no
 * root tag stays as it is.
 *
 * @remarks The marks are ASCII. Thus a server can mark the bytes of a page
 * through a `latin1` string, which keeps each byte of the other text.
 */
export function markRoot(html: string, { classes, attributes }: RootMarks): string {
	if (classes.length === 0 && attributes.length === 0) return html

	const added = attributes.map((name) => ` ${name}=""`).join('')

	return html.replace(ROOT_TAG, (_, attrs: string) => {
		if (classes.length === 0) return `<html${attrs}${added}>`

		const own = CLASS_ATTRIBUTE.exec(attrs)

		const merged = ` class="${[own?.[1], ...classes].filter(Boolean).join(' ')}"`

		const rest = own ? attrs.replace(CLASS_ATTRIBUTE, '') : attrs

		return `<html${rest}${merged}${added}>`
	})
}
