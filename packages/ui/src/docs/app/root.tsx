import pages from 'virtual:docs/pages'
import { PanelLeft, PanelLeftDashed } from 'lucide-react'
import { type ReactNode, useEffect } from 'react'
import {
	Links,
	Meta,
	Outlet,
	Scripts,
	ScrollRestoration,
	useLocation,
	useMatches,
	useNavigate,
} from 'react-router'
import { Button } from 'ui/button'
import { loadShiki } from 'ui/code'
import { Flex } from 'ui/flex'
import { Heading } from 'ui/heading'
import { Icon } from 'ui/icon'
import { SidebarLayout, SidebarLayoutHeader } from 'ui/layouts'
import { CurrentScrollScript } from 'ui/primitives/current'
import { AppearanceSettings, useAppearance } from 'ui/providers/appearance'
import { LocaleProvider } from 'ui/providers/locale'
import { UIDocument, UIProvider } from 'ui/providers/ui'
import { Stack } from 'ui/stack'
import { useHydrated } from '../../hooks/use-hydrated.ts'
import { noop } from '../../utilities/noop.ts'
import {
	BugLogButton,
	EventLogButton,
	EventLogScript,
	EventLogSwitch,
	recordRoute,
} from '../debug/event-log/index.tsx'
import { useIdle } from '../kit/idle.ts'
import appCss from './app.css?url'
import { PageError } from './page-error.tsx'
import { NavigateContext, RouterLink } from './router-link.tsx'
import { DocsSidebar } from './sidebar.tsx'

// The id of the last script that runs before the first paint. The page paints
// only when the parser reaches it, so the sidebar does not paint before the
// main column, and the current item is in view at the first paint.
const FIRST_PAINT = 'first-paint'

// The document of each page. `UIDocument` holds `AppearanceProvider`, so each
// prerendered file has the script of the latin face before its content. The
// fallback for a path with no page renders no route, so a provider in a route
// would leave that file with no latin face.
export function Layout({ children }: { children: ReactNode }) {
	return (
		<UIDocument
			className="antialiased"
			bodyClassName="bg-white text-zinc-950 lg:bg-zinc-100 dark:bg-zinc-950 dark:text-white"
			head={
				<>
					<meta charSet="UTF-8" />
					<meta name="viewport" content="width=device-width, initial-scale=1.0" />
					<link rel="expect" href={`#${FIRST_PAINT}`} blocking="render" />
					<EventLogScript />
					<Meta />
					<Links />
				</>
			}
		>
			{children}
			<ScrollRestoration />
			<CurrentScrollScript id={FIRST_PAINT} />
			<Scripts />
		</UIDocument>
	)
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
function warmShiki() {
	loadShiki().catch(noop)
}

// The actions of the header. They take no props, so the shell gives the same
// element at each render, and React does not render them again.
const ACTIONS = (
	<>
		<EventLogButton />
		<BugLogButton />
		<AppearanceSettings>
			<EventLogSwitch />
		</AppearanceSettings>
	</>
)

/**
 * The shell of the docs: the sidebar, the header with the name of the page, and the page.
 *
 * The page renders in the `en-US` locale. The build renders each page with the
 * default locale of Node, and the browser hydrates it with the default locale
 * of the reader. A fixed locale makes the two renders agree.
 */
export default function App() {
	const { pathname } = useLocation()

	const { sidebar, setSidebar } = useAppearance()

	const matches = useMatches()

	const navigate = useNavigate()

	// The page of the matched route. A path that only starts with the path of a
	// page, such as `/button/foo`, matches the not-found route, so it has no page.
	const page = pages.find((link) => matches.some((match) => match.id === link.path))

	// The root path lists the pages, and has no title of its own.
	const title = page?.name ?? (pathname === '/' ? undefined : 'Not found')

	useEffect(() => recordRoute(pathname), [pathname])

	useIdle(warmShiki)

	return (
		// The links match the path of the page, so the item of a page is current
		// on each tab of the page, and no item is current on the not-found page.
		<NavigateContext value={navigate}>
			<UIProvider link={RouterLink} pathname={page?.path ?? pathname}>
				<title>{title ? `${title} · Docs` : 'Docs'}</title>
				<Stylesheet />
				<SidebarLayout stickyHeader actions={ACTIONS} sidebar={<DocsSidebar pages={pages} />}>
					<SidebarLayoutHeader>
						<Flex align="center" gap="md">
							<Button
								variant="bare"
								className="max-lg:hidden"
								aria-label="Toggle sidebar"
								onClick={() => setSidebar(sidebar === 'offcanvas' ? 'locked' : 'offcanvas')}
							>
								{/* The class of the root selects the icon, so the first paint shows the stored mode. */}
								<Icon icon={<PanelLeftDashed />} className="sidebar-offcanvas:hidden" />
								<Icon icon={<PanelLeft />} className="hidden sidebar-offcanvas:block" />
							</Button>
							<Heading>{title ?? 'Docs'}</Heading>
						</Flex>
					</SidebarLayoutHeader>
					<Stack gap="xl">
						<LocaleProvider locale="en-US">
							<Outlet />
						</LocaleProvider>
					</Stack>
				</SidebarLayout>
			</UIProvider>
		</NavigateContext>
	)
}

/**
 * Shows in place of the shell when the shell fails to render. An error in a
 * page stays in the error boundary of the pages (`routes/page.tsx`).
 */
export function ErrorBoundary() {
	return <PageError level={1} />
}
