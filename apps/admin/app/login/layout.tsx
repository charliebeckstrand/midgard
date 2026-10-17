import type { ReactNode } from 'react'
import { RequestLocale } from 'shared/locale'

/**
 * The page reads the session, so the route renders for each request. The
 * layout reads the locale of the request in the same render.
 */
export const instant = false

/**
 * Shell of the sign-in page. It renders the page in the locale of the request,
 * so the controls of the form show their text in the language of the reader
 * from the first render.
 */
export default function LoginLayout({ children }: { children: ReactNode }) {
	return <RequestLocale>{children}</RequestLocale>
}
