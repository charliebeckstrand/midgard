// @vitest-environment jsdom
// The idle work reads `window.requestIdleCallback`.
import { Marked } from 'marked'
import { afterEach, describe, expect, it, vi } from 'vitest'
import { MARKDOWN_CACHE_SIZE } from '../../components/markdown/markdown.tsx'
import { primeApi } from '../kit/api-entry.tsx'
import { runInSlices } from '../kit/idle.ts'
import type { BarrelApi } from '../plugin/api.ts'

// The idle callbacks that wait, so each test runs the idle periods itself.
let pending: IdleRequestCallback[] = []

/** Runs the next idle period, with `left` ms in it or the time that `left` gives. */
function idle(left: number | (() => number)): void {
	const callback = pending.shift()

	callback?.({ didTimeout: false, timeRemaining: typeof left === 'number' ? () => left : left })
}

function stubIdle(): void {
	pending = []

	vi.stubGlobal('requestIdleCallback', (callback: IdleRequestCallback) => {
		pending.push(callback)

		return pending.length
	})
}

afterEach(() => {
	vi.unstubAllGlobals()

	vi.restoreAllMocks()
})

/** The sources that `marked` lexes from now on. A source in the token cache does not lex again. */
function spyLex(): () => string[] {
	const lexer = vi.spyOn(Marked.prototype, 'lexer')

	return () => lexer.mock.calls.map(([source]) => source)
}

describe('runInSlices', () => {
	it('runs one step in a period with 2 ms or less in it, and more steps in a longer period', () => {
		stubIdle()

		let steps = 0

		let left = 0

		runInSlices(() => {
			steps += 1

			left -= 3

			return true
		}, new AbortController().signal)

		idle(2)

		expect(steps).toBe(1)

		// The period has 10 ms, and each step takes 3 ms of it.
		left = 10

		idle(() => left)

		expect(steps).toBe(4)

		expect(pending).toHaveLength(1)
	})

	it('stops when the step returns false', () => {
		stubIdle()

		let steps = 0

		runInSlices(() => {
			steps += 1

			return steps < 3
		}, new AbortController().signal)

		idle(50)

		expect(steps).toBe(3)

		expect(pending).toHaveLength(0)
	})

	it('stops when the signal aborts', () => {
		stubIdle()

		const controller = new AbortController()

		const step = vi.fn(() => true)

		runInSlices(step, controller.signal)

		idle(0)

		controller.abort()

		idle(50)

		expect(step).toHaveBeenCalledTimes(1)

		expect(pending).toHaveLength(0)
	})
})

describe('primeApi', () => {
	it('lexes each description once, in the order of the accordion', () => {
		stubIdle()

		const api: BarrelApi = {
			A: {
				name: 'A',
				description: 'The component that primes first.',
				props: [{ name: 'size', description: 'The prop that primes second.' }],
				events: [{ name: 'onPick', description: 'The prop that primes second.' }],
			},
			B: {
				name: 'B',
				props: [{ name: 'tone', description: 'The prop that primes third.' }],
				events: [],
			},
		}

		const lexed = spyLex()

		primeApi(api, new AbortController().signal)

		idle(50)

		expect(lexed()).toEqual([
			'The component that primes first.',
			'The prop that primes second.',
			'The prop that primes third.',
		])
	})

	it('stops when the token cache is full, so it does not drop a source that it stored', () => {
		stubIdle()

		const props = Array.from({ length: MARKDOWN_CACHE_SIZE + 50 }, (_, index) => ({
			name: `prop${index}`,
			description: `The prop ${index} of a big barrel.`,
		}))

		const lexed = spyLex()

		primeApi({ Big: { name: 'Big', props, events: [] } }, new AbortController().signal)

		idle(Number.POSITIVE_INFINITY)

		expect(lexed()).toHaveLength(MARKDOWN_CACHE_SIZE)

		expect(lexed().at(-1)).toBe(`The prop ${MARKDOWN_CACHE_SIZE - 1} of a big barrel.`)
	})
})
