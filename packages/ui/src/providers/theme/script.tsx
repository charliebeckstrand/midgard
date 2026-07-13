import type { ThemeMode } from './context'

/** Props for {@link ThemeScript}. */
export type ThemeScriptProps = {
	/**
	 * The `localStorage` key holding the preference. Match the
	 * `ThemeProvider` key.
	 * @defaultValue 'theme'
	 */
	storageKey?: string
	/**
	 * The preference assumed when storage holds none. Match the
	 * `ThemeProvider` default.
	 * @defaultValue 'system'
	 */
	defaultMode?: ThemeMode
}

/**
 * Inline no-flash script for server-rendered apps: applies the stored theme
 * preference — the root `.dark` class and `color-scheme` — synchronously,
 * before the first paint, so a dark-mode visitor never flashes light.
 *
 * @remarks
 * Render it at the top of `<body>` (or in `<head>`), ahead of the page
 * content, alongside a {@link ThemeProvider} mounted with the same
 * `storageKey` and `defaultMode`. Add `suppressHydrationWarning` to
 * `<html>`: the script mutates its class before React attaches.
 */
export function ThemeScript({ storageKey = 'theme', defaultMode = 'system' }: ThemeScriptProps) {
	const script = `(function () {
	try {
		var mode = localStorage.getItem(${JSON.stringify(storageKey)}) || ${JSON.stringify(defaultMode)}

		if (mode !== 'light' && mode !== 'dark') {
			mode = matchMedia('(prefers-color-scheme: dark)').matches ? 'dark' : 'light'
		}

		document.documentElement.classList.toggle('dark', mode === 'dark')

		document.documentElement.style.colorScheme = mode
	} catch (_) {}
})()`

	// biome-ignore lint/security/noDangerouslySetInnerHtml: the script is a static template over JSON-encoded props.
	return <script data-slot="theme-script" dangerouslySetInnerHTML={{ __html: script }} />
}
