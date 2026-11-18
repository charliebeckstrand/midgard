'use client'

import { useRouter } from 'next/navigation'
import type { MouseEvent } from 'react'
import { createSeed, runPath } from '../utilities/seed'

/**
 * The click of a link that starts the run of a new seed: a link to `/`, or to
 * `/vs` against the CPU. A plain click makes the seed and goes to its address,
 * such as `/vs/k3x9q2`, in one request.
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

	return (event: MouseEvent<HTMLAnchorElement>) => {
		if (event.metaKey || event.ctrlKey || event.shiftKey || event.altKey) return

		event.preventDefault()

		router.push(runPath(createSeed(), vsCpu))
	}
}
