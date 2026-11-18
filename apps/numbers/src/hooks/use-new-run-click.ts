'use client'

import { useRouter } from 'next/navigation'
import type { MouseEvent } from 'react'
import { useTakePreloaded } from '../components/run-preload'
import { createSeed, runPath } from '../utilities/seed'

/**
 * The click of a link that starts the run of a new seed: a link to `/`, or to
 * `/vs` against the CPU. A plain click goes to the address of a new seed, such
 * as `/vs/k3x9q2`, in one request. The seed of the other mode is preloaded
 * (`RunPreloadProvider`), so a switch of mode needs no request. Else the click
 * makes the seed.
 *
 * Through the address of the link, the navigation needs three requests in a
 * row. `proxy.ts` sends a redirect to a new seed. The redirect drops the `_rsc`
 * parameter of the request, so Next sends a second redirect that puts it back.
 * Then the page comes.
 *
 * A click with a modifier is for the browser, such as a new tab. The browser
 * opens the address of the link, and `proxy.ts` sends it to a new seed.
 */
export function useNewRunClick(vsCpu: boolean) {
	const router = useRouter()

	const takePreloaded = useTakePreloaded()

	return (event: MouseEvent<HTMLAnchorElement>) => {
		if (event.metaKey || event.ctrlKey || event.shiftKey || event.altKey) return

		event.preventDefault()

		router.push(runPath(takePreloaded(vsCpu) ?? createSeed(), vsCpu))
	}
}
