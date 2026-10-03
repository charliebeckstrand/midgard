import type { ComponentType, ReactNode } from 'react'
import { Links, Meta, Scripts, ScrollRestoration } from 'react-router'
import fontUrl from '../../fonts/google-sans-flex.woff2?url'
import { AppearanceScript } from '../../providers/appearance'
import appCss from '../app.css?url'
import { App } from '../engine/app'
import { initRegistry } from '../engine/registry'

// The preload fetches the font with the document, and not after the first
// layout finds text in it.
// The glob runs here, in ui, so Vite resolves it against ui's own `demos/`
// tree. Keep the patterns the same as `demo-globs.ts`, which lists the pages
// that the build renders.
initRegistry(
	import.meta.glob<ComponentType>(
		[
			'../demos/components/*.tsx',
			'../demos/primitives/*.tsx',
			'../demos/providers/*.tsx',
			'../demos/modules/*.tsx',
			'../demos/modules/*/index.tsx',
			'../demos/structure/*.tsx',
		],
		{ import: 'Demo' },
	),
)

export const links = () => [
	{ rel: 'preload', href: fontUrl, as: 'font', type: 'font/woff2', crossOrigin: 'anonymous' },
	{ rel: 'stylesheet', href: appCss },
]

export function Layout({ children }: { children: ReactNode }) {
	return (
		<html lang="en" className="antialiased" suppressHydrationWarning>
			<head>
				<meta charSet="UTF-8" />
				<meta name="viewport" content="width=device-width, initial-scale=1.0" />
				<title>Docs</title>
				<AppearanceScript />
				<Meta />
				<Links />
			</head>
			{/* No full height here. The sidebar layout sets its own height: below lg
			    the page scrolls, and from lg up the layout is pinned to the viewport.
			    The body color matches the layout, so an overscroll shows no band. */}
			<body className="bg-white lg:bg-zinc-100 dark:bg-zinc-950 text-zinc-950 dark:text-white">
				{children}
				<ScrollRestoration />
				<Scripts />
			</body>
		</html>
	)
}

export default App
