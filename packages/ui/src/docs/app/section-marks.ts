import { readCookie } from '../../utilities/cookie.ts'
import { getOrCompute } from '../../utilities/get-or-compute.ts'
import type { StoredChoice } from '../../utilities/stored-choice.ts'

// Each section of the sidebar starts open, and its title closes it. The state
// of each section is a stored choice, as the appearance is: a copy in
// `localStorage` and a copy in a cookie. The docs server reads the cookies and
// writes a class on the root element for each closed section
// ({@link sectionRootClasses}). The rules of {@link sectionRules} hide such a
// section from the first paint to the render that applies the stored state.
// Thus the first paint has the final layout (CONVENTIONS §3.13), and the close
// does not animate on the load. The prerendered HTML has each section open,
// so the hydration render has each section open too. A section that holds the
// current page shows at the first paint, because the page opens its section.

/** The open state of one section. */
type SectionState = 'open' | 'closed'

/** The prefix of the cookie and of the `localStorage` key of a section. The section folder follows it. */
const KEY_PREFIX = 'docs-section-'

/** The prefix of the class of the root element for a closed section. The section folder follows it. */
const CLASS_PREFIX = 'docs-section-closed-'

/** A section folder, such as `modules`. Only such a name goes into a class or a selector. */
const FOLDER = /^[a-z][a-z0-9-]*$/

const choices = new Map<string, StoredChoice<SectionState>>()

/** The stored choice of `section`. One object for each section, so a hook that keys on it stays stable. */
export function sectionChoice(section: string): StoredChoice<SectionState> {
	return getOrCompute(choices, section, () => ({
		key: `${KEY_PREFIX}${section}`,
		values: ['open', 'closed'],
		fallback: 'open',
	}))
}

/**
 * The classes of the root element for the closed sections in `cookies`, the
 * `Cookie` header of a request. The docs server writes them on `<html>`.
 */
export function sectionRootClasses(cookies = ''): string[] {
	return cookies
		.split(';')
		.map((part) => part.trim().split('=', 1)[0] ?? '')
		.filter((name) => name.startsWith(KEY_PREFIX))
		.map((name) => name.slice(KEY_PREFIX.length))
		.filter((section) => FOLDER.test(section))
		.filter((section) => readCookie(`${KEY_PREFIX}${section}`, cookies) === 'closed')
		.map((section) => `${CLASS_PREFIX}${section}`)
}

/**
 * The style rules that hide each closed section of the root classes until the
 * stored state applies. A section stamps `data-docs-live` from then on
 * (`useSectionsOpen`). A section that holds the current page stamps
 * `data-docs-current`, and does not hide. The letter rail of the components hides
 * with them.
 */
export function sectionRules(sections: readonly string[]): string {
	return sections
		.filter((section) => FOLDER.test(section))
		.map((section) => {
			const root = `:root.${CLASS_PREFIX}${section}`

			const hidden = `[data-docs-section="${section}"]:not([data-docs-live]):not([data-docs-current])`

			return [
				`${root} ${hidden} [data-slot="collapse-panel"]{display:none}`,
				`${root} ${hidden} [data-slot="collapse-trigger"] svg{rotate:-90deg}`,
				`${root} ${hidden} [data-slot="collapse-trigger"] svg:dir(rtl){rotate:90deg}`,
				`${root}:has(${hidden}) [data-docs-rail="${section}"]{display:none}`,
			].join('')
		})
		.join('')
}
