import { type MouseEvent, useState } from 'react'
import { PrefetchPageLinks } from 'react-router'
import { composeEventHandlers } from 'ui/core'
import { useTimeout } from 'ui/hooks'
import type { LinkProps } from 'ui/primitives/link'
import { hasBrowserModifier } from '../../utilities/modifier-keys.ts'
import { isPrimaryPress } from '../../utilities/primary-press.ts'
import { useShellNavigate } from './context.ts'

/**
 * The time in ms that the reader points at a link or focuses it before the
 * link loads the code of its page. It is the delay of the `prefetch="intent"`
 * of the `Link` of React Router.
 */
const PREFETCH_DELAY = 100

/** A click that the browser handles itself: a click with a modifier key, another button, or another target. */
function isNativeClick(event: MouseEvent<HTMLAnchorElement>, target: string | undefined) {
	return (
		!isPrimaryPress(event) ||
		(target !== undefined && target !== '_self') ||
		hasBrowserModifier(event) ||
		event.shiftKey
	)
}

/**
 * The link of ui in the docs. A click on a path of the site goes through the
 * router, so a page switch keeps the shell. The link loads the code of its
 * page when the reader points at it or focuses it for {@link PREFETCH_DELAY},
 * as the `prefetch="intent"` of `Link` does.
 *
 * A hash alone, such as `#disabled`, also goes through the router, to an
 * element of the current page.
 *
 * The `Link` of React Router reads the location and the route, so each item
 * of the sidebar renders again on each change of the router state, and a
 * navigation then spends a long time on those renders at 4x CPU.
 * This link reads only the `navigate` of the shell, and it reads the location
 * at the click.
 */
export function RouterLink({
	href,
	target,
	onClick,
	onMouseEnter,
	onMouseLeave,
	onFocus,
	onBlur,
	...props
}: LinkProps) {
	const navigate = useShellNavigate()

	const [prefetch, setPrefetch] = useState(false)

	const timeout = useTimeout()

	// A path that starts with one slash is a page of the site. A URL, or a path
	// that starts with two slashes, goes to another host.
	const isPage = href.startsWith('/') && !href.startsWith('//')

	// A hash alone names an element of this page. It goes through the router, so
	// each click gives a new location, also a click on the hash that the page
	// has already, for which the browser fires no event. The shell then scrolls
	// to the element, and the API table opens a closed entry again.
	const internal = isPage || href.startsWith('#')

	// A second hover or focus does not start the delay again.
	const start = () => {
		if (!timeout.pending()) timeout.set(() => setPrefetch(true), PREFETCH_DELAY)
	}

	const cancel = () => {
		timeout.clear()

		setPrefetch(false)
	}

	return (
		<>
			<a
				href={href}
				target={target}
				{...props}
				onClick={composeEventHandlers(onClick, (event) => {
					if (!internal || isNativeClick(event, target)) return

					event.preventDefault()

					// A click on the link of the current page replaces the entry, so the
					// back button does not stay on the same page.
					const { pathname, search, hash } = window.location

					const current = href.startsWith('#') ? hash : pathname + search + hash

					navigate(href, { replace: current === href })
				})}
				onMouseEnter={composeEventHandlers(onMouseEnter, start)}
				onMouseLeave={composeEventHandlers(onMouseLeave, cancel)}
				onFocus={composeEventHandlers(onFocus, start)}
				onBlur={composeEventHandlers(onBlur, cancel)}
			/>
			{isPage && prefetch && <PrefetchPageLinks page={href} />}
		</>
	)
}
