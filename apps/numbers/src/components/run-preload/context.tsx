'use client'

import { useRouter } from 'next/navigation'
import { type ReactNode, useEffect, useRef } from 'react'
import { createContext } from 'ui/core'
import { createSeed, runPath } from '../../utilities/seed'

/** The kinds of a prefetch of the router. Next does not export the type. */
type PrefetchKind = NonNullable<Parameters<ReturnType<typeof useRouter>['prefetch']>[1]>['kind']

/**
 * The kind of prefetch that `<Link prefetch>` does: the page with the data of
 * the request, so the navigation needs no request. The default kind gets only
 * the shell of the route.
 */
const FULL = 'full' as PrefetchKind

/**
 * How long a browser with no `requestIdleCallback`, such as Safari, waits after
 * the load of the page before the preload.
 */
const IDLE_FALLBACK_MS = 1000

/**
 * Calls `callback` in idle time after the load of the page, so the work stays
 * in the background. A page that has loaded schedules it at once. A browser
 * with no `requestIdleCallback` calls it after {@link IDLE_FALLBACK_MS}.
 *
 * @returns The cancel of the call.
 */
function whenLoadedAndIdle(callback: () => void): () => void {
	const request =
		window.requestIdleCallback ?? ((call: () => void) => window.setTimeout(call, IDLE_FALLBACK_MS))

	const cancel = window.cancelIdleCallback ?? window.clearTimeout

	let handle: number | undefined

	const schedule = () => {
		handle = request(callback)
	}

	if (document.readyState === 'complete') schedule()
	else window.addEventListener('load', schedule, { once: true })

	return () => {
		window.removeEventListener('load', schedule)

		if (handle !== undefined) cancel(handle)
	}
}

/** Gives the preloaded seed of a mode once, or `null`. `vsCpu` is the mode: against the CPU, or solo. */
type TakePreloaded = (vsCpu: boolean) => string | null

const [RunPreloadContext, useTakePreloaded] = createContext<TakePreloaded>('RunPreload', {
	default: () => null,
})

export { useTakePreloaded }

/** Props for {@link RunPreloadProvider}. */
export type RunPreloadProviderProps = {
	/** The mode of the page: against the CPU, or solo. */
	vsCpu: boolean
	children: ReactNode
}

/**
 * Preloads the run of a new seed in the other mode, so a switch of mode shows
 * it at once. When the page shows, the provider makes the seed. After the load
 * of the page, in idle time, Next prefetches the page of the seed with the data
 * of the request. Thus the preload does not slow the page that the reader
 * opened. A switch takes the seed once ({@link useTakePreloaded}), so a second
 * switch does not play it again. A switch before the prefetch gets the page
 * from the server, and the seed that it took is not prefetched.
 *
 * Cache Components holds a route that the reader leaves. The effect runs at
 * each show, so a return to a held route preloads a new seed.
 *
 * A prefetch is stale after 5 minutes. A switch after that time gets the page
 * from the server, as a link does.
 */
export function RunPreloadProvider({ vsCpu, children }: RunPreloadProviderProps) {
	const router = useRouter()

	const preloaded = useRef<string | null>(null)

	useEffect(() => {
		const seed = createSeed()

		preloaded.current = seed

		// A switch before the idle time took the seed, and its navigation fetches
		// the page. A prefetch of the same page would be a second render.
		const cancel = whenLoadedAndIdle(() => {
			if (preloaded.current === seed) router.prefetch(runPath(seed, !vsCpu), { kind: FULL })
		})

		return () => {
			cancel()

			preloaded.current = null
		}
	}, [router, vsCpu])

	const take: TakePreloaded = (mode) => {
		if (mode === vsCpu) return null

		const seed = preloaded.current

		preloaded.current = null

		return seed
	}

	return <RunPreloadContext value={take}>{children}</RunPreloadContext>
}
