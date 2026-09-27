'use client'

import Script from 'next/script'
import { useEffect, useRef } from 'react'

type TurnstileApi = {
	render: (
		container: HTMLElement,
		options: {
			sitekey: string
			callback: (token: string) => void
			'expired-callback': () => void
			'error-callback': () => void
		},
	) => string
	remove: (widgetId: string) => void
}

declare global {
	interface Window {
		turnstile?: TurnstileApi
	}
}

type TurnstileProps = {
	siteKey: string
	/** Gets the token when the check passes, and `null` when the token expires or the check fails. */
	onToken: (token: string | null) => void
}

/**
 * Cloudflare Turnstile widget. It shows the check and gives its token to `onToken`.
 *
 * @remarks
 * The widget reads `onToken` when it mounts, so give a stable function, such as a state setter.
 * A token is good for one sign-up. Mount a new widget (a new `key`) to get a new token.
 */
export function Turnstile({ siteKey, onToken }: TurnstileProps) {
	const container = useRef<HTMLDivElement>(null)

	const widget = useRef<string | null>(null)

	const render = () => {
		if (!container.current || !window.turnstile || widget.current) return

		widget.current = window.turnstile.render(container.current, {
			sitekey: siteKey,
			callback: (token) => onToken(token),
			'expired-callback': () => onToken(null),
			'error-callback': () => onToken(null),
		})
	}

	useEffect(
		() => () => {
			if (widget.current) window.turnstile?.remove(widget.current)

			widget.current = null
		},
		[],
	)

	return (
		<>
			<Script
				src="https://challenges.cloudflare.com/turnstile/v0/api.js?render=explicit"
				onReady={render}
			/>
			<div ref={container} className="flex justify-center" />
		</>
	)
}
