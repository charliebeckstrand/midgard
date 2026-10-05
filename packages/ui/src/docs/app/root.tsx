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
import { AppearanceProvider, AppearanceScript, AppearanceSettings } from 'ui/providers/appearance'
import { UIProvider } from 'ui/providers/ui'
import { Stack } from 'ui/stack'
import { Text } from 'ui/text'
import { useHydrated } from '../../hooks/use-hydrated.ts'
import { noop } from '../../utilities/noop.ts'
import {
	EventLogButton,
	EventLogScript,
	EventLogSwitch,
	recordRoute,
} from '../debug/event-log/index.tsx'
import appCss from './app.css?url'
import { DocsSidebar } from './sidebar.tsx'

// The id of the last script that runs before the first paint. The page paints
// only when the parser reaches it, so the sidebar does not paint before the
// main column, and the current item is in view at the first paint.
const FIRST_PAINT = 'first-paint'

// The document of each page. It holds `AppearanceProvider`, so each
// prerendered file has the script of the latin face before its content. The
// fallback for a path with no page renders no route, so a provider in a route
// would leave that file with no latin face.
export function Layout({ children }: { children: ReactNode }) {
	return (
		<html lang="en" className="antialiased" suppressHydrationWarning>
			<head>
				<meta charSet="UTF-8" />
				<meta name="viewport" content="width=device-width, initial-scale=1.0" />
				<link rel="expect" href={`#${FIRST_PAINT}`} blocking="render" />
				<AppearanceScript />
				<EventLogScript />
				<Meta />
				<Links />
			</head>
			<body className="bg-white text-zinc-950 lg:bg-zinc-100 dark:bg-zinc-950 dark:text-white">
				<AppearanceProvider>{children}</AppearanceProvider>
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
			loadShiki().catch(noop)
		})

		return () => cancel(handle)
	}, [])
}

// The actions of the header. They take no props, so the shell gives the same
// element at each render, and React does not render them again.
const ACTIONS = (
	<>
		<EventLogButton />
		<AppearanceSettings>
			<EventLogSwitch />
		</AppearanceSettings>
	</>
)

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
			<title>{page ? `${page.name} · Docs` : 'Docs'}</title>
			<Stylesheet />
			<SidebarLayout
				stickyHeader
				floating={!locked}
				actions={ACTIONS}
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
