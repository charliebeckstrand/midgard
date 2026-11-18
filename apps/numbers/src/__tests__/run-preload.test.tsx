// @vitest-environment jsdom
import { cleanup, render } from '@testing-library/react'
import { afterEach, describe, expect, it, vi } from 'vitest'
import { RunPreloadProvider, useTakePreloaded } from '../components/run-preload'

const prefetch = vi.fn()

vi.mock('next/navigation', () => ({ useRouter: () => ({ prefetch }) }))

afterEach(() => {
	cleanup()

	vi.clearAllMocks()
})

/** Renders the provider of a page in `vsCpu` mode, and gives its take. */
function renderProvider(vsCpu: boolean) {
	let take: ReturnType<typeof useTakePreloaded> = () => null

	function Reader() {
		take = useTakePreloaded()

		return null
	}

	const view = render(
		<RunPreloadProvider vsCpu={vsCpu}>
			<Reader />
		</RunPreloadProvider>,
	)

	return { take: (mode: boolean) => take(mode), view }
}

describe('RunPreloadProvider', () => {
	it.each([
		['solo', false, /^\/vs\/([a-z0-9]{6})$/],
		['vs CPU', true, /^\/([a-z0-9]{6})$/],
	])(
		'on a %s page, prefetches the whole page of a new seed in the other mode',
		(_, vsCpu, address) => {
			const { take } = renderProvider(vsCpu)

			expect(prefetch).toHaveBeenCalledTimes(1)

			const [path, options] = prefetch.mock.calls[0] ?? []

			// The full kind gets the page with its data, as `<Link prefetch>` does.
			expect(options).toEqual({ kind: 'full' })

			const seed = String(path).match(address)?.[1]

			expect(seed).toBeDefined()

			// The switch gets the preloaded seed once, so a second switch does not play it again.
			expect(take(!vsCpu)).toBe(seed)
			expect(take(!vsCpu)).toBeNull()
		},
	)

	it('preloads no run of the mode of the page', () => {
		const { take } = renderProvider(false)

		expect(take(false)).toBeNull()

		expect(take(true)).not.toBeNull()
	})

	it('drops the seed when the page hides, so a held route does not keep it', () => {
		const { take, view } = renderProvider(false)

		view.unmount()

		expect(take(true)).toBeNull()
	})
})
