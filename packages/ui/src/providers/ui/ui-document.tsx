import type { ReactNode } from 'react'
import { AppearanceProvider } from '../appearance/appearance'
import { AppearanceScript } from '../appearance/appearance-script'

/** Props for {@link UIDocument}: the document attributes, more `head` content, and `children`. */
export type UIDocumentProps = {
	/**
	 * The language of the document, on `<html>`.
	 *
	 * @defaultValue 'en'
	 */
	lang?: string
	/** Classes of the `<html>` element. */
	className?: string
	/** Classes of the `<body>` element. */
	bodyClassName?: string
	/**
	 * More content of `<head>`, such as the meta tags and the links of a
	 * framework. It goes before {@link AppearanceScript}.
	 */
	head?: ReactNode
	/** The content of `<body>`. */
	children: ReactNode
}

/**
 * The document of an app: `<html>`, `<head>`, and `<body>`. It renders the
 * pre-paint step of ui and the provider of that step together, so an app
 * cannot have one without the other:
 *
 * - `<head>` holds {@link AppearanceScript}, which applies the stored theme
 *   and density before the first paint.
 * - `<body>` wraps `children` in {@link AppearanceProvider}, which keeps the
 *   theme and the density, and adds the latin face of the font before the
 *   first paint of text.
 *
 * `<html>` has `suppressHydrationWarning`, because the script changes its
 * classes before React hydrates. Render it as the root layout of the app.
 *
 * @remarks The file has no `'use client'`, so a server layout can render it.
 * @example
 * ```tsx
 * export default function RootLayout({ children }: { children: ReactNode }) {
 *   return (
 *     <UIDocument bodyClassName="bg-white dark:bg-zinc-900">
 *       <Providers>{children}</Providers>
 *     </UIDocument>
 *   )
 * }
 * ```
 */
export function UIDocument({
	lang = 'en',
	className,
	bodyClassName,
	head,
	children,
}: UIDocumentProps) {
	return (
		<html lang={lang} className={className} suppressHydrationWarning>
			<head>
				{head}
				<AppearanceScript />
			</head>
			<body className={bodyClassName}>
				<AppearanceProvider>{children}</AppearanceProvider>
			</body>
		</html>
	)
}
