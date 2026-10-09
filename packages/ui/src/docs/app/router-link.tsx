import { type MouseEvent, useState } from 'react'
import { type NavigateFunction, PrefetchPageLinks } from 'react-router'
import { composeEventHandlers, createContext } from 'ui/core'
import { useTimeout } from 'ui/hooks'
import type { LinkProps } from 'ui/primitives/link'

/**
 * The `navigate` of the shell. The function of the root route does not change,
 * so a link that reads it does not render again on a navigation.
 */
export const [NavigateContext, useShellNavigate] = createContext<NavigateFunction>('Navigate')

/** A click that the browser handles itself: a click with a modifier key, another button, or another target. */
function isNativeClick(event: MouseEvent<HTMLAnchorElement>, target: string | undefined) {
	return (
		event.button !== 0 ||
		(target !== undefined && target !== '_self') ||
		event.metaKey ||
		event.altKey ||
		event.ctrlKey ||
		event.shiftKey
	)
}

/**
 * The link of ui in the docs. A click on a path of the site goes through the
 * router, so a page switch keeps the shell. The link loads the code of its
 * page when the reader points at it or focuses it for 100 ms, as the
 * `prefetch="intent"` of `Link` does.
 *
 * The `Link` of React Router reads the location and the route, so each of the
 * about 100 items of the sidebar renders again on each change of the router
 * state. A navigation then spends about 100 ms more at 4x CPU. This link reads
 * only the `navigate` of the shell, and it reads the location at the click.
 */
export function RouterLink({
	href,
	target,
	onClick,
	onMouseEnter,
	onMouseLeave,
	onFocus,
	onBlur,
	onTouchStart,
	...props
}: LinkProps) {
	const navigate = useShellNavigate()

	const [prefetch, setPrefetch] = useState(false)

	const timeout = useTimeout()

	// A path that starts with one slash is a page of the site. A URL, or a path
	// that starts with two slashes, goes to another host.
	const internal = href.startsWith('/') && !href.startsWith('//')

	// A second hover, focus, or touch does not start the 100 ms again.
	const start = () => {
		if (!timeout.pending()) timeout.set(() => setPrefetch(true), 100)
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

					navigate(href, { replace: pathname + search + hash === href })
				})}
				onMouseEnter={composeEventHandlers(onMouseEnter, start)}
				onMouseLeave={composeEventHandlers(onMouseLeave, cancel)}
				onFocus={composeEventHandlers(onFocus, start)}
				onBlur={composeEventHandlers(onBlur, cancel)}
				onTouchStart={composeEventHandlers(onTouchStart, start)}
			/>
			{internal && prefetch && <PrefetchPageLinks page={href} />}
		</>
	)
}
