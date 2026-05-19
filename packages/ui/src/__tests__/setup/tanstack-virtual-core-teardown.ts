/**
 * Suppress @tanstack/virtual-core teardown noise.
 *
 * Its debounced timer fires after jsdom teardown, causing a "window is not
 * defined" ReferenceError. We only swallow that specific error so real
 * unhandled errors still fail the suite.
 */

const originalOnError = window.onerror

window.onerror = (message, ...args) => {
	if (typeof message === 'string' && message.includes('window is not defined')) {
		return true
	}

	return originalOnError ? originalOnError(message, ...args) : false
}

const originalOnUnhandledRejection = window.onunhandledrejection

window.onunhandledrejection = (event: PromiseRejectionEvent) => {
	const msg = event.reason?.message ?? String(event.reason)

	if (typeof msg === 'string' && msg.includes('window is not defined')) {
		event.preventDefault()

		return
	}

	originalOnUnhandledRejection?.call(window, event)
}
