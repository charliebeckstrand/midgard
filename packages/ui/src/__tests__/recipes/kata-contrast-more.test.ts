// @vitest-environment node
import { describe, expect, it } from 'vitest'
import { k as fileUpload } from '../../recipes/kata/file-upload'
import { k as markdown } from '../../recipes/kata/markdown'
import { classNames } from '../helpers/class-stops'

/**
 * When the user asks for more contrast, a line that a kata draws takes the step of `sen.border`.
 *
 * A kata that writes its own border color has no `contrast-more:` step, so the line stays at its
 * low contrast. Each line here takes a `sen.border.color` tone, which carries the step in each
 * mode.
 */
describe('kata lines under prefers-contrast: more', () => {
	const lines: [string, unknown][] = [
		['the Markdown blockquote bar', markdown().blockquote],
		['the dashed edge of a FileUpload dropzone', fileUpload.dropzone],
	]

	it.each(lines)('gives %s a step in each mode', (_name, line) => {
		const classes = classNames([line])

		expect(classes.some((className) => className.startsWith('contrast-more:border-'))).toBe(true)

		expect(classes.some((className) => className.startsWith('dark:contrast-more:border-'))).toBe(
			true,
		)
	})
})
