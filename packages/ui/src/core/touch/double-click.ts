/**
 * The `dblclick` listeners of the document go on the root element, so that the
 * root style of `base.ts` stops the double tap of iOS on each page.
 *
 * On iOS, WebKit can join two quick taps into one double-click. The second tap
 * then gets no click, and the double-click goes to the point of the first tap.
 * WebKit does this when a node at the tap, or an ancestor of it, listens for
 * `dblclick` and allows a double tap (`nodeRespondingToDoubleClickEvent`). An
 * element allows it only when the element and each of its ancestor elements
 * have `touch-action: auto`. The root style of `base.ts` is `manipulation`, so
 * no element of the page allows it. The document is not an element, and it
 * always allows a double tap (`Node::allowsDoubleTapGesture`).
 *
 * React listens for `dblclick` on the container of its root. React Router and
 * Next.js hydrate the document, so the container is the document. Thus each
 * quick tap next to the tap before, such as on the next day of a `Calendar`,
 * clicks the first control again, and the second control gets no click.
 *
 * A listener on the root element gets each `dblclick` of the page, because the
 * event bubbles from its target to the root element. React binds the container
 * to each listener, and it does not read the node of the listener. Thus its
 * double-click handlers work as before.
 */

/** The documents whose listeners go on the root element. */
const moved = new WeakSet<Document>()

/** The methods of a document that this module replaces. */
const METHODS = ['addEventListener', 'removeEventListener'] as const

/**
 * Puts each `dblclick` listener that a script adds to the document on the root
 * element instead. The removal of such a listener goes to the root element too.
 * Each other event type stays on the document. Call it before the app hydrates,
 * so the listeners of the React root go on the root element. A second call for
 * one document does nothing.
 *
 * @param doc - The document whose `dblclick` listeners move. The default is
 * the document of the page.
 */
export function moveDoubleClickToRoot(doc: Document = document): void {
	if (moved.has(doc)) return

	moved.add(doc)

	for (const name of METHODS) {
		const method: unknown = Reflect.get(doc, name)

		if (typeof method !== 'function') continue

		Reflect.set(doc, name, function (this: unknown, type: string, ...rest: unknown[]) {
			const target = type === 'dblclick' ? (doc.documentElement ?? this) : this

			return Reflect.apply(method, target, [type, ...rest])
		})
	}
}
