import type { Metadata } from 'next'

/**
 * The title of a page in the tab and the history of the browser: the title of
 * the page, then the name of its app, such as `Users | Admin`. A screen reader
 * announces it after each navigation.
 *
 * @param title - The title of the page.
 * @param app - The name of the app.
 */
export function formatTitle(title: string, app: string): string {
	return `${title} | ${app}`
}

/**
 * The `title` of the root layout of an app. The home page shows the name of the
 * app, and each other page puts its own title before the name
 * ({@link formatTitle}).
 *
 * @param app - The name of the app.
 */
export function appTitle(app: string): Metadata['title'] {
	return { default: app, template: formatTitle('%s', app) }
}
