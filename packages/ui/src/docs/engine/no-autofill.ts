// The text fields. A checkbox, a radio, or a range takes no text, so it stays out.
const FIELDS =
	'textarea, input:not([type]), input[type="text"], input[type="search"], input[type="email"], input[type="tel"], input[type="url"], input[type="number"], input[type="password"]'

/**
 * The attributes that stop the browser suggestions in a field. Some browsers
 * do not obey `autocomplete="off"`. Safari on iOS thus also needs
 * `autocorrect`, `autocapitalize`, and `spellcheck` to stop its suggestion bar.
 */
export const NO_AUTOFILL_ATTRIBUTES = {
	autocomplete: 'off',
	autocorrect: 'off',
	autocapitalize: 'off',
	spellcheck: 'false',
} as const

const ENTRIES = Object.entries(NO_AUTOFILL_ATTRIBUTES)

function quiet(field: Element) {
	for (const [name, value] of ENTRIES) {
		// A write of the same value also makes a mutation record, and the observer would loop.
		if (field.getAttribute(name) !== value) field.setAttribute(name, value)
	}
}

function quietWithin(node: Node) {
	if (!(node instanceof Element)) return

	if (node.matches(FIELDS)) quiet(node)

	for (const field of node.querySelectorAll(FIELDS)) quiet(field)
}

/**
 * Stop the autofill and the typing suggestions of the browser in each text
 * field under `root`. The docs site calls it once on the body, so it covers
 * the demos, the fields that a demo portals to the body, and the docs search.
 *
 * @remarks
 * The docs chrome sets the attributes on the DOM, so the ui components keep
 * their own defaults and the derived code of an example shows no extra prop.
 * A `MutationObserver` keeps the attributes on a field that mounts later, such
 * as a field in a new playground value, and on a field whose props change.
 *
 * @returns A cleanup that stops the observer.
 */
export function noAutofill(root: Element) {
	quietWithin(root)

	const observer = new MutationObserver((records) => {
		for (const record of records) {
			if (record.type === 'attributes') {
				if (record.target instanceof Element && record.target.matches(FIELDS)) quiet(record.target)
			}

			for (const node of record.addedNodes) quietWithin(node)
		}
	})

	// A new `type` can make a field a text field, and a new prop of the component
	// can write over an attribute.
	observer.observe(root, {
		childList: true,
		subtree: true,
		attributeFilter: ['type', ...Object.keys(NO_AUTOFILL_ATTRIBUTES)],
	})

	return () => observer.disconnect()
}
