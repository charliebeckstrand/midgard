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
 * it at once. When the page shows, the provider makes the seed, and Next
 * prefetches its page with the data of the request. A switch takes the seed
 * once ({@link useTakePreloaded}), so a second switch does not play it again.
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

		router.prefetch(runPath(seed, !vsCpu), { kind: FULL })

		return () => {
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
