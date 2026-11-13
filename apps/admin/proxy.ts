export { proxy } from 'auth/proxy'

// The public images, such as the app icon, show on the signed-out pages too, and
// the image optimizer of Next requests them without the cookie of the reader.
// Thus the session gate does not run for a `.png` file.
export const config = {
	matcher: ['/((?!_next/static|_next/image|favicon.ico|.*\\.png$).*)'],
}
