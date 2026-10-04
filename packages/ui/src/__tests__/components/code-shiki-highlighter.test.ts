// @vitest-environment node
import { codeToHtml } from 'shiki'
import { describe, expect, it } from 'vitest'
import { highlightShiki, loadShikiPair } from '../../components/code/code-shiki-highlighter'

// The highlighter of the Shiki worker, with real grammars. The jsdom suites
// replace the worker with a fake, so this suite holds the markup to the
// contract that `primeCodeBlock` states.

const SAMPLE = `import { useState } from 'react'

export function Counter({ start = 0 }: { start?: number }) {
	const [count, setCount] = useState(start)

	return <button onClick={() => setCount(count + 1)}>{count} &amp; more</button>
}`

describe('highlightShiki', () => {
	it('gives the markup of codeToHtml with tabindex -1, which primeCodeBlock asks for', async () => {
		const options = { lang: 'tsx', theme: 'github-dark-default', tabindex: -1 } as const

		const html = await highlightShiki(SAMPLE, options.lang, options.theme)

		expect(html).toBe(await codeToHtml(SAMPLE, options))

		expect(html).toContain('tabindex="-1"')
	})

	it('loads a grammar by its alias and a theme other than the default', async () => {
		const html = await highlightShiki('const a: number = 1', 'ts', 'github-light-default')

		expect(html).toBe(
			await codeToHtml('const a: number = 1', {
				lang: 'ts',
				theme: 'github-light-default',
				tabindex: -1,
			}),
		)
	})

	it('highlights plain text with no grammar', async () => {
		const html = await highlightShiki('a < b', 'text', 'github-dark-default')

		expect(html).toContain('<pre class="shiki github-dark-default"')

		expect(html).toContain('a &#x3C; b')
	})

	it.each([
		['a language that Shiki does not bundle', 'no-such-grammar', 'github-dark-default'],
		['a key of the prototype', 'constructor', 'github-dark-default'],
		['a theme that Shiki does not bundle', 'tsx', 'no-such-theme'],
	])('rejects %s', async (_case, lang, theme) => {
		await expect(loadShikiPair(lang, theme)).rejects.toThrow('Shiki bundles no')
	})
})
