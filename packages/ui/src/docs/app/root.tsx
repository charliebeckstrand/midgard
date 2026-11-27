import pages from 'virtual:docs/pages'
import { PanelLeft, PanelLeftDashed } from 'lucide-react'
import { type ReactNode, startTransition, useEffect, useRef, useState } from 'react'
import { Links, Meta, Outlet, Scripts, useLocation, useNavigate } from 'react-router'
import { Button } from 'ui/button'
import { loadShiki } from 'ui/code'
import { announce } from 'ui/core'
import { EventsAside, EventsButton, EventsSwitch } from 'ui/events'
import { Flex } from 'ui/flex'
import { Heading } from 'ui/heading'
import { Icon } from 'ui/icon'
import { SidebarLayout, SidebarLayoutBody, SidebarLayoutHeader } from 'ui/layouts'
import { defineMessage, defineMessages, useIntl } from 'ui/primitives/intl'
import {
	AppearanceLanguageField,
	AppearanceProvider,
	AppearanceSettings,
	AppearanceSidebarField,
	useAppearance,
} from 'ui/providers/appearance'
import { LocaleProvider } from 'ui/providers/locale'
import { UIProvider } from 'ui/providers/ui'
import { Stack } from 'ui/stack'
import { noop } from '../../utilities/noop.ts'
import { PageTitle } from '../kit/page-title.tsx'
import { useIdle } from '../kit/use-idle.ts'
import { useShortcutPlatformKeys } from '../kit/use-shortcut-platform.ts'
import { SearchIconButton } from '../search/ui/search-button.tsx'
import { DocsSearch, SearchPaletteHost } from '../search/ui/search-provider.tsx'
import appCss from './app.css?url'
import { catalogs } from './catalogs.ts'
import { NavigateContext, useDocumentLocale } from './context.ts'
import { DirectionListbox } from './direction.tsx'
import { LOCALES } from './language.ts'
import { PageError } from './page-error.tsx'
import { RouterLink } from './router-link.tsx'
import { DocsSidebar } from './sidebar.tsx'
import { StaleBuildScript } from './stale-build.tsx'
import { useMatchedPage } from './use-matched-page.ts'
import { useNavigationScroll } from './use-navigation-scroll.ts'

/**
 * The document of each page. The appearance provider is here, so each
 * prerendered file has the script of the latin face before its content. The
 * fallback for a path with no page renders no route, so a provider in a route
 * would leave that file with no latin face. The root element has the
 * language of the locale that the page renders in. The docs server writes the
 * stored settings of the reader on the root element of each page
 * (`scripts/docs/server.ts`), so its classes differ from the markup of React.
 */
export function Layout({ children }: { children: ReactNode }) {
	return (
		<html lang={useDocumentLocale()} className="antialiased" suppressHydrationWarning>
			<head>
				<meta charSet="UTF-8" />
				<meta name="viewport" content="width=device-width, initial-scale=1.0" />
				<StaleBuildScript />
				<Meta />
				<Links />
			</head>
			<body className="bg-white text-zinc-950 lg:bg-zinc-100 dark:bg-zinc-950 dark:text-white">
				<AppearanceProvider>
					{children}
					<Scripts />
				</AppearanceProvider>
			</body>
		</html>
	)
}

// The full stylesheet. Each prerendered page holds its own critical CSS, so
// the full sheet loads after hydration and does not delay the first paint.
// React holds a commit until each new stylesheet in it is ready. The sheet
// thus comes in a transition: in an urgent update, it would hold each urgent
// commit of the page until the sheet loads. A navigation is a transition, so
// React holds the next page until the sheet is ready. The dev server has no
// critical CSS, so the sheet loads at once.
function Stylesheet() {
	const [load, setLoad] = useState(import.meta.env.DEV)

	useEffect(() => startTransition(() => setLoad(true)), [])

	return load ? <link rel="stylesheet" href={appCss} precedence="default" /> : null
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
		<SearchIconButton />
		<EventsButton />
		<AppearanceSettings>
			<DirectionListbox />
			<AppearanceLanguageField />
			<AppearanceSidebarField />
			<EventsSwitch />
		</AppearanceSettings>
	</>
)

// The pinned panel of the events. It takes no props, for the same reason.
const ASIDE = <EventsAside />

// The box that scrolls the docs. It has the height of the viewport, so the
// document is never taller than the screen. Chrome on iOS collapses its
// toolbars only on a page that is taller than the screen, and on a load of
// such a page it draws the old page under the toolbar for a frame. The
// toolbars of a phone thus stay at their full size while the box scrolls. The
// box is a size container, so the layout fills the box (`SidebarLayout`).
//
// In print, the box has the height of its content and does not scroll, so each
// page of the docs prints whole. The box is not a size container in print: a
// size container gets no height from its content.
const SCROLLER =
	'h-dvh overflow-y-auto @container-size print:h-auto print:overflow-visible print:@container-normal'

const messages = defineMessages({
	toggleSidebar: {
		id: 'docs.app.toggleSidebar',
		defaultMessage: 'Toggle sidebar',
		description:
			'The name of the button in the header that shows or hides the sidebar on a wide screen.',
	},
})

// The title and the heading of a path that has no page.
const notFoundMessage = defineMessage({
	id: 'docs.notFound.title',
	defaultMessage: 'Page not found',
	description:
		'The title and the heading of the page that shows for a path that has no page of the docs.',
})

// The locales that the reader can choose in the settings. With one locale, the
// provider gets no `locales`, so the settings have no Language picker.
const LOCALE_CHOICES = LOCALES.length > 1 ? LOCALES : undefined

/**
 * The shell of the docs: the sidebar, the header with the name of the page, and the page.
 *
 * The shell renders in the locale of the HTML of the page
 * (`DocumentLocale` in `context.ts`), on the server and in the hydration render, so the
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
			<LocaleProvider locale={useDocumentLocale()} locales={LOCALE_CHOICES} catalogs={catalogs}>
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

	const intl = useIntl()

	// The layout binds `$mod+B` to the sidebar (`SidebarLayout`).
	const sidebarKeys = useShortcutPlatformKeys('B')

	const page = useMatchedPage()

	// A path with no page, such as `/button/foo`, takes the title of the
	// not-found page.
	const title = page?.name ?? intl.formatMessage(notFoundMessage)

	useIdle(warmShiki)

	// The path of the page, the same for each of its tabs.
	const path = page?.path ?? pathname

	const scroller = useNavigationScroll(path)

	// The root element has the language of the HTML at the first paint
	// (`Layout`). When the reader changes the language, it takes the new one,
	// so a screen reader reads the page in the language of its text.
	useEffect(() => {
		document.documentElement.lang = intl.locale
	}, [intl.locale])

	// A move to a new page changes the title and the content, but the focus stays
	// on the link in the sidebar, so nothing tells a screen reader that the page
	// changed. A polite message gives the title of the new page. The first page
	// and a change of the tab or the hash give no message: the reader asked for
	// the first page, and a tab announces itself.
	const announcedPath = useRef(path)

	useEffect(() => {
		if (announcedPath.current === path) return

		announcedPath.current = path

		announce(title)
	}, [path, title])

	return (
		// The links match the path of the page, so the item of a page is current
		// on each tab of the page, and no item is current on the not-found page.
		<UIProvider link={RouterLink} pathname={path}>
			{/* A page with tabs puts the name of the tab in the title (`PageTabs`). */}
			{!page?.tabs.length && <PageTitle page={title} />}
			<Stylesheet />
			<DocsSearch>
				<div ref={scroller} className={SCROLLER}>
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
									aria-expanded={sidebar === 'locked'}
									aria-keyshortcuts={sidebarKeys}
									onClick={() => setSidebar(sidebar === 'offcanvas' ? 'locked' : 'offcanvas')}
								>
									{/* The class of the root selects the icon, so the first paint shows the stored mode. */}
									<Icon icon={<PanelLeftDashed />} className="sidebar-offcanvas:hidden" />
									<Icon icon={<PanelLeft />} className="hidden sidebar-offcanvas:block" />
								</Button>
								<Heading>{title}</Heading>
							</Flex>
						</SidebarLayoutHeader>
						<SearchPaletteHost />
						<SidebarLayoutBody>
							<Stack gap="xl">
								<Outlet />
							</Stack>
						</SidebarLayoutBody>
					</SidebarLayout>
				</div>
			</DocsSearch>
		</UIProvider>
	)
}

/**
 * Shows in place of the shell when the shell fails to render, in the main
 * landmark. An error in a page stays in the error boundary of the pages
 * (`routes/page.tsx`).
 */
export function ErrorBoundary() {
	return (
		<main>
			<PageError level={1} />
		</main>
	)
}
