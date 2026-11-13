import { join } from 'node:path'
import { describe, expect, it } from 'vitest'
import { workspaceRoot, workspaceSources } from '../helpers/walk-source'

// Date-text boundary (CONVENTIONS.md §3.10, §3.13).
//
// The text of a date comes from the date data of the JavaScript engine, and
// two engines can write different text for one format, such as Node on the
// server and Safari in the browser. Text that the server writes and the
// browser writes again in the hydration render can thus differ, and React then
// renders the tree again from the start. Before, Elections and Places each
// formatted dates on the server in their own way.
//
// So the apps, `auth`, and `shared` write no date text with `Intl` by hand.
// The server writes it with `formatDateText` in `ui/server`, and the browser
// with `DateTime` or `useDateFormat`, which wait for hydration.

const SCAN_ROOTS = [
	join(workspaceRoot, 'apps'),
	join(workspaceRoot, 'packages', 'auth'),
	join(workspaceRoot, 'packages', 'shared'),
]

/** A date formatter of `Intl`, or a date method that formats with one. */
const HAND_FORMAT = /\bIntl\.DateTimeFormat\s*\(|\.toLocale(?:Date|Time)String\s*\(/

describe('date-text boundary', () => {
	it('finds each spelling of a hand-written date text', () => {
		expect(HAND_FORMAT.test("new Intl.DateTimeFormat('en', options)")).toBe(true)
		expect(HAND_FORMAT.test('Intl.DateTimeFormat(locale)')).toBe(true)
		expect(HAND_FORMAT.test('date.toLocaleDateString()')).toBe(true)
		expect(HAND_FORMAT.test("date.toLocaleTimeString('en')")).toBe(true)
		expect(HAND_FORMAT.test('const options: Intl.DateTimeFormatOptions = {}')).toBe(false)
		expect(HAND_FORMAT.test('count.toLocaleString()')).toBe(false)
	})

	it('writes each date text through ui', () => {
		const files = workspaceSources(SCAN_ROOTS)

		expect(files.size).toBeGreaterThan(0)

		const violations = [...files].filter(([, code]) => HAND_FORMAT.test(code)).map(([file]) => file)

		expect(
			violations,
			`files that format a date with Intl by hand (use \`formatDateText\` from \`ui/server\` on the server, or \`DateTime\` and \`useDateFormat\` in the browser):\n  ${violations.join('\n  ')}`,
		).toEqual([])
	})
})
