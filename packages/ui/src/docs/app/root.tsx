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
import { EventsAside, EventsButton, EventsSwitch } from 'ui/events'
import { Flex } from 'ui/flex'
import { Heading } from 'ui/heading'
import { Icon } from 'ui/icon'
import { SidebarLayout, SidebarLayoutBody, SidebarLayoutHeader } from 'ui/layouts'
import { CurrentScrollScript } from 'ui/primitives/current'
import { defineMessage, defineMessages, useIntl } from 'ui/primitives/intl'
import { AppearanceSettings, useAppearance } from 'ui/providers/appearance'
import { LocaleProvider } from 'ui/providers/locale'
import { UIDocument, UIProvider } from 'ui/providers/ui'
import { Stack } from 'ui/stack'
import { useHydrated } from '../../hooks/use-hydrated.ts'
import { noop } from '../../utilities/noop.ts'
import { DebugScript } from '../debug/index.tsx'
import { useIdle } from '../kit/idle.ts'
import appCss from './app.css?url'
import { appMessages } from './app-messages.ts'
import { catalogs } from './catalogs.ts'
import { DirectionListbox, DirectionScript } from './direction.tsx'
import { useDocumentLocale } from './document-locale.ts'
import { LOCALES } from './language.ts'
import { PageError } from './page-error.tsx'
import { NavigateContext, RouterLink } from './router-link.tsx'
import { DocsSearch, SearchPaletteHost } from './search.tsx'
import { DocsSidebar } from './sidebar.tsx'
import { StaleBuildScript } from './stale-build.tsx'

// The id of the last script that runs before the first paint. The page paints
// only when the parser reaches it, so the sidebar does not paint before the
// main column, and the current item is in view at the first paint.
const FIRST_PAINT = 'first-paint'

/**
 * The document of each page. `UIDocument` holds `AppearanceProvider`, so each
 * prerendered file has the script of the latin face before its content. The
 * fallback for a path with no page renders no route, so a provider in a route
 * would leave that file with no latin face. The root element has the
 * language of the locale that the page renders in.
 */
export function Layout({ children }: { children: ReactNode }) {
	return (
		<UIDocument
			lang={useDocumentLocale()}
			className="antialiased"
			bodyClassName="bg-white text-zinc-950 lg:bg-zinc-100 dark:bg-zinc-950 dark:text-white"
			head={
				<>
					<meta charSet="UTF-8" />
					<meta name="viewport" content="width=device-width, initial-scale=1.0" />
					<StaleBuildScript />
					<link rel="expect" href={`#${FIRST_PAINT}`} blocking="render" />
					<DirectionScript />
					<DebugScript />
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
		<EventsButton />
		<AppearanceSettings>
			<DirectionListbox />
			<EventsSwitch />
		</AppearanceSettings>
	</>
)

// The pinned panel of the events. It takes no props, for the same reason.
const ASIDE = <EventsAside />

const messages = defineMessages({
	notFound: {
		id: 'docs.app.notFound',
		defaultMessage: 'Not found',
		description:
			'The title of a page whose path has no page of the docs. It shows in the header and in the title of the browser tab.',
	},
	toggleSidebar: {
		id: 'docs.app.toggleSidebar',
		defaultMessage: 'Toggle sidebar',
		description:
			'The name of the button in the header that shows or hides the sidebar on a wide screen.',
	},
})

// The title of the browser tab on a page: the name of the page, then the name of the docs.
const pageTitleMessage = defineMessage<{ page: string }>({
	id: 'docs.app.pageTitle',
	defaultMessage: '{page} · Docs',
	description:
		'The title of the browser tab on a page of the docs. The page is the name of the page, such as Button.',
})

/**
 * The shell of the docs: the sidebar, the header with the name of the page, and the page.
 *
 * The shell renders in the locale of the HTML of the page
 * (`document-locale.ts`), on the server and in the hydration render, so the
 * two renders agree. After hydration, the shell takes the locale that the
 * reader chooses in the settings. The server sends the HTML of that locale, so
 * the two are the same at the first paint. The provider holds the whole shell,
 * so the settings dialog reads the choice, and the shell shows its text in the
 * language of the choice.
 */
export default function App() {
	const navigate = useNavigate()

	return (
		<NavigateContext value={navigate}>
			<LocaleProvider locale={useDocumentLocale()} locales={LOCALES} catalogs={catalogs}>
				<Shell />
			</LocaleProvider>
		</NavigateContext>
	)
}

// The content of the shell. It reads the intl of the locale provider of the
// shell, so it is a component under that provider.
function Shell() {
	const { pathname } = useLocation()

	const { sidebar, setSidebar } = useAppearance()

	const matches = useMatches()

	const intl = useIntl()

	// The page of the matched route. A path that only starts with the path of a
	// page, such as `/button/foo`, matches the not-found route, so it has no page.
	const page = pages.find((link) => matches.some((match) => match.id === link.path))

	// The root path lists the pages, and has no title of its own.
	const title = page?.name ?? (pathname === '/' ? undefined : intl.formatMessage(messages.notFound))

	const docs = intl.formatMessage(appMessages.docs)

	useIdle(warmShiki)

	// The root element has the language of the HTML at the first paint
	// (`Layout`). When the reader changes the language, it takes the new one,
	// so a screen reader reads the page in the language of its text.
	useEffect(() => {
		document.documentElement.lang = intl.locale
	}, [intl.locale])

	return (
		// The links match the path of the page, so the item of a page is current
		// on each tab of the page, and no item is current on the not-found page.
		<UIProvider link={RouterLink} pathname={page?.path ?? pathname}>
			<title>{title ? intl.formatMessage(pageTitleMessage, { page: title }) : docs}</title>
			<Stylesheet />
			<DocsSearch>
				<SidebarLayout
					stickyHeader
					actions={ACTIONS}
					sidebar={<DocsSidebar pages={pages} />}
					aside={ASIDE}
				>
					<SidebarLayoutHeader>
						<Flex align="center" gap="md">
							<Button
								variant="bare"
								className="hidden lg:inline-flex"
								aria-label={intl.formatMessage(messages.toggleSidebar)}
								onClick={() => setSidebar(sidebar === 'offcanvas' ? 'locked' : 'offcanvas')}
							>
								{/* The class of the root selects the icon, so the first paint shows the stored mode. */}
								<Icon icon={<PanelLeftDashed />} className="sidebar-offcanvas:hidden" />
								<Icon icon={<PanelLeft />} className="hidden sidebar-offcanvas:block" />
							</Button>
							<Heading>{title ?? docs}</Heading>
						</Flex>
					</SidebarLayoutHeader>
					<SearchPaletteHost />
					<SidebarLayoutBody>
						<Stack gap="xl">
							<Outlet />
						</Stack>
					</SidebarLayoutBody>
				</SidebarLayout>
			</DocsSearch>
		</UIProvider>
	)
}

/**
 * Shows in place of the shell when the shell fails to render. An error in a
 * page stays in the error boundary of the pages (`routes/page.tsx`).
 */
export function ErrorBoundary() {
	return <PageError level={1} />
}
