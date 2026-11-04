/* The head script of `stale-build.tsx`. The page loads it as a file, before its module scripts. Keep the keys and the times the same as in that module. */
;(() => {
	/** The `sessionStorage` key of the time of the last reload. */
	const RELOADED = 'docs:stale-reload'
	/** The time, in ms, in which a second failure does not reload. */
	const GUARD = 10_000
	/** The elements of the module files of the page. */
	const MODULES = 'script[type=module][src],link[rel=modulepreload]'
	/** The longest time, in ms, that the script waits for the new fetches before it reloads. */
	const REFETCH_LIMIT = 5000

	function stop() {
		window.removeEventListener('error', fail, true)
		window.removeEventListener('unhandledrejection', fail)
		delete window.__staleBuild
	}

	function fail(event) {
		const target = event.target

		if (
			event.type === 'error' &&
			!(
				target &&
				(target.tagName === 'SCRIPT' ||
					(target.tagName === 'LINK' && target.rel === 'modulepreload'))
			)
		) {
			return
		}

		stop()

		let reload = false
		let reloaded = false

		try {
			reload = Date.now() - Number(sessionStorage.getItem(RELOADED)) >= GUARD
			if (reload) sessionStorage.setItem(RELOADED, String(Date.now()))
		} catch {
			reload = false
		}

		const finish = () => {
			if (reload && !reloaded) {
				reloaded = true
				location.reload()
			}
		}

		setTimeout(finish, REFETCH_LIMIT)

		Promise.all(
			Array.from(document.querySelectorAll(MODULES), (element) =>
				fetch(element.src || element.href, { cache: 'reload' }).catch(() => {}),
			),
		).then(finish)
	}

	window.addEventListener('error', fail, true)
	window.addEventListener('unhandledrejection', fail)
	window.__staleBuild = stop
})()
