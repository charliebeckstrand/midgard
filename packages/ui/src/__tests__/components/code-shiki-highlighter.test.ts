// @vitest-environment node
import { codeToHtml } from 'shiki'
import { describe, expect, it, vi } from 'vitest'
import {
	getHighlighter,
	highlightShiki,
	loadShikiPair,
	warmShikiPair,
} from '../../components/code/code-shiki-highlighter'

// The highlighter of the Shiki worker, with real grammars. The jsdom suites
// replace the worker with a fake, so this suite holds the markup to the
// contract that `primeCodeBlock` states.

const SAMPLE = `import { useState } from 'react'

export function Counter({ start = 0 }: { start?: number }) {
	const [count, setCount] = useState(start)

	return <button onClick={() => setCount(count + 1)}>{count} &amp; more</button>
}`

describe('highlightShiki', () => {
	it('gives the markup of codeToHtml with the options that primeCodeBlock asks for', async () => {
		const options = {
			lang: 'tsx',
			theme: 'github-dark-default',
			tabindex: -1,
			tokenizeTimeLimit: 0,
		} as const

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
				tokenizeTimeLimit: 0,
			}),
		)
	})

	it('gives each token of a line that tokenizes slowly', async ({ signal }) => {
		const code = 'const answer: number = 42'

		const whole = await highlightShiki(code, 'tsx', 'github-dark-default')

		signal.throwIfAborted()

		// Each read of the clock is one second later. Shiki stops a line after
		// 500 ms by default, and then gives the rest of the line as one token.
		let now = 0

		vi.spyOn(Date, 'now').mockImplementation(() => {
			now += 1000

			return now
		})

		expect(await highlightShiki(code, 'tsx', 'github-dark-default')).toBe(whole)
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

describe('warmShikiPair', () => {
	/** A spy on the tokenizer that the warm-up runs, which still tokenizes. */
	async function spyTokenizer() {
		return vi.spyOn(await getHighlighter(), 'codeToTokensBase')
	}

	it('tokenizes the tsx samples on the first warm-up of the grammar only', async () => {
		const tokenize = await spyTokenizer()

		await warmShikiPair('tsx', 'github-dark-default')

		expect(tokenize).toHaveBeenCalledTimes(5)

		expect(tokenize.mock.calls.map(([, options]) => options.lang)).toEqual(Array(5).fill('tsx'))

		// The RegExps of a grammar serve each theme, so another theme does not
		// tokenize the samples again.
		await warmShikiPair('tsx', 'github-light-default')

		expect(tokenize).toHaveBeenCalledTimes(5)
	})

	it('finds the samples by the grammar name, so an alias warms the grammar', async () => {
		const tokenize = await spyTokenizer()

		await warmShikiPair('ts', 'github-dark-default')

		expect(tokenize).toHaveBeenCalledOnce()

		expect(tokenize).toHaveBeenCalledWith(expect.stringContaining('function greet'), {
			lang: 'ts',
			theme: 'github-dark-default',
		})

		await warmShikiPair('typescript', 'github-dark-default')

		expect(tokenize).toHaveBeenCalledOnce()
	})

	it.each(['css', 'text'])('only loads %s, which has no samples', async (lang) => {
		const tokenize = await spyTokenizer()

		await warmShikiPair(lang, 'github-dark-default')

		expect(tokenize).not.toHaveBeenCalled()
	})
})
