import pages from 'virtual:docs/pages'
import { PanelLeft, PanelLeftDashed } from 'lucide-react'
import { type ReactNode, useEffect, useState } from 'react'
import { Link, Links, Meta, Outlet, Scripts, ScrollRestoration, useLocation } from 'react-router'
import { Button } from 'ui/button'
import { loadShiki } from 'ui/code'
import { Flex } from 'ui/flex'
import { Heading } from 'ui/heading'
import { Icon } from 'ui/icon'
import { SidebarLayout, SidebarLayoutHeader } from 'ui/layouts'
import { CurrentScrollScript } from 'ui/primitives/current'
import type { LinkProps } from 'ui/primitives/link'
import { AppearanceProvider, AppearanceScript } from 'ui/providers/appearance'
import { UIProvider } from 'ui/providers/ui'
import { Stack } from 'ui/stack'
import { Text } from 'ui/text'
import fontUrl from '../../fonts/google-sans-flex-latin.woff2?url'
import { useHydrated } from '../../hooks/use-hydrated.ts'
import { EventLogButton, EventLogScript, recordRoute } from '../debug/event-log/index.tsx'
import appCss from './app.css?url'
import { Settings } from './settings.tsx'
import { DocsSidebar } from './sidebar.tsx'

// The id of the last script that runs before the first paint. The page paints
// only when the parser reaches it, so the sidebar does not paint before the
// main column, and the current item is in view at the first paint.
const FIRST_PAINT = 'first-paint'

export function Layout({ children }: { children: ReactNode }) {
	return (
		<html lang="en" className="antialiased" suppressHydrationWarning>
			<head>
				<meta charSet="UTF-8" />
				<meta name="viewport" content="width=device-width, initial-scale=1.0" />
				<link rel="expect" href={`#${FIRST_PAINT}`} blocking="render" />
				<AppearanceScript />
				<EventLogScript />
				{/* The latin face of the font of ui, at the URL of its face in the
				    stylesheet. The `FontPreload` of ui writes a file URL in a Vite
				    server build, so the docs give the link themselves. */}
				<link rel="preload" href={fontUrl} as="font" type="font/woff2" crossOrigin="" />
				<Meta />
				<Links />
			</head>
			<body className="bg-white text-zinc-950 lg:bg-zinc-100 dark:bg-zinc-950 dark:text-white">
				{children}
				<ScrollRestoration />
				<CurrentScrollScript id={FIRST_PAINT} />
				<Scripts />
			</body>
		</html>
	)
}

// The links of ui go through the router, so a page switch keeps the shell. A
// link loads the code of its page when the reader points at it or focuses it.
function RouterLink({ href, ...props }: LinkProps) {
	return <Link to={href} prefetch="intent" {...props} />
}

// The full stylesheet. Each prerendered page holds its own critical CSS, so
// the full sheet loads after hydration and does not delay the first paint. A
// navigation is a transition, so React holds the next page until the sheet
// is ready. The dev server has no critical CSS, so the sheet loads at once.
function Stylesheet() {
	const hydrated = useHydrated()

	return hydrated || import.meta.env.DEV ? (
		<link rel="stylesheet" href={appCss} precedence="default" />
	) : null
}

// Shiki loads its grammar and theme in idle time, so the first "Show code"
// of a playground does not wait for them.
function useShikiWarmup() {
	useEffect(() => {
		const idle = window.requestIdleCallback ?? ((callback: () => void) => setTimeout(callback, 1))

		const cancel = window.cancelIdleCallback ?? clearTimeout

		const handle = idle(() => {
			loadShiki().catch(() => {})
		})

		return () => cancel(handle)
	}, [])
}

/** The shell of the docs: the sidebar, the header with the name of the page, and the page. */
export default function App() {
	const { pathname } = useLocation()

	const [locked, setLocked] = useState(true)

	const page = pages.find((link) => pathname === link.path || pathname.startsWith(`${link.path}/`))

	const title = page?.name ?? (pathname === '/' ? 'Docs' : 'Not found')

	useEffect(() => recordRoute(pathname), [pathname])

	useShikiWarmup()

	return (
		<UIProvider link={RouterLink}>
			<AppearanceProvider>
				<title>{page ? `${page.name} · Docs` : 'Docs'}</title>
				<Stylesheet />
				<SidebarLayout
					stickyHeader
					floating={!locked}
					actions={
						<>
							<EventLogButton />
							<Settings />
						</>
					}
					sidebar={<DocsSidebar pages={pages} current={page?.path} />}
				>
					<SidebarLayoutHeader>
						<Flex align="center" gap="md">
							<Button
								variant="bare"
								className="max-lg:hidden"
								aria-label={locked ? 'Float sidebar' : 'Lock sidebar'}
								onClick={() => setLocked(!locked)}
							>
								<Icon icon={locked ? <PanelLeftDashed /> : <PanelLeft />} />
							</Button>
							<Heading>{title}</Heading>
						</Flex>
					</SidebarLayoutHeader>
					<Stack gap="xl">
						<Outlet />
					</Stack>
				</SidebarLayout>
			</AppearanceProvider>
		</UIProvider>
	)
}

/** Shows in place of a page that fails to render, so one page does not take down the site. */
export function ErrorBoundary() {
	return (
		<Stack gap="md" className="p-6">
			<Heading>Could not load this page</Heading>
			<Text tone="muted">Reload the page to try again.</Text>
			<div>
				<Button variant="outline" onClick={() => location.reload()}>
					Reload
				</Button>
			</div>
		</Stack>
	)
}
