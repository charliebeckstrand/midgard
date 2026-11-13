export { proxy } from 'auth/proxy'

// The app icon is a public file, and the signed-out pages show it too. Thus the
// session gate does not run for it.
export const config = {
	matcher: ['/((?!_next/static|_next/image|favicon.ico|icon.png).*)'],
}
