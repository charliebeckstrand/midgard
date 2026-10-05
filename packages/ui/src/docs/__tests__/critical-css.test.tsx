// @vitest-environment node
import { renderToStaticMarkup } from 'react-dom/server'
import { describe, expect, it } from 'vitest'
import { scanClasses } from '../plugin/styles.ts'

describe('scanClasses', () => {
	it.each([
		'[:root[data-debug]_&]:contents',
		'has-[>:disabled]:opacity-50',
		"after:content-['']",
		'[&>[data-slot=field]+[data-slot]]:mt-2',
	])('finds %s in the HTML that React renders', (name) => {
		const html = renderToStaticMarkup(<span className={`hidden ${name}`} />)

		expect(scanClasses(html)).toEqual(expect.arrayContaining(['hidden', name]))
	})
})
