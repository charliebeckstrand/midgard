import type { ReactNode } from 'react'
import { AppearanceProvider } from '../appearance'

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
	/** More content of `<head>`, such as the meta tags and the links of a framework. */
	head?: ReactNode
	/** The content of `<body>`. */
	children: ReactNode
}

/**
 * The document of an app: `<html>`, `<head>`, and `<body>`. `<body>` wraps
 * `children` in {@link AppearanceProvider}, which keeps the theme and the
 * density, and adds the latin face of the font before the first paint of
 * text.
 *
 * The document has no script before the first paint. The server of the app
 * writes the stored settings of the reader on `<html>` (`rootMarks` and
 * `markRoot`). Thus `<html>` has `suppressHydrationWarning`, because its
 * classes and attributes differ from the props. Render it as the root layout
 * of the app.
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
			<head>{head}</head>
			<body className={bodyClassName}>
				<AppearanceProvider>{children}</AppearanceProvider>
			</body>
		</html>
	)
}
