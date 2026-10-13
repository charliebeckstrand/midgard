import { globSync, readFileSync, writeFileSync } from 'node:fs'
import path from 'node:path'

// A `modulepreload` link that React renders, up to the end of its tag.
const MODULE_PRELOAD = /<link rel="modulepreload"[^>]*?(?=\/?>)/g

/**
 * Gives each `modulepreload` link in `html` the low fetch priority. A link
 * that has a fetch priority keeps it.
 */
export function lowerPreloads(html: string): string {
	return html.replace(MODULE_PRELOAD, (link) =>
		/\sfetchpriority=/i.test(link) ? link : `${link} fetchpriority="low"`,
	)
}

/**
 * Gives each `modulepreload` link of each prerendered page the low fetch
 * priority ({@link lowerPreloads}).
 *
 * The first paint of a page waits for the script of the latin face, and not
 * for the modules (`FontScript` in `ui/providers/appearance`). The parser
 * finds that script in the body, after the module links in the head. A CDN
 * sends the responses of one priority in the order of the requests. At the
 * same priority, the CDN thus sends each module before the script, and the
 * first paint waits for each module on a slow network. At the low priority,
 * the CDN sends the script first. Hydration needs the script and each module,
 * so it does not start later.
 */
export function lowerPreloadPriority(clientDir: string): void {
	for (const page of globSync('**/*.html', { cwd: clientDir })) {
		const file = path.join(clientDir, page)

		writeFileSync(file, lowerPreloads(readFileSync(file, 'utf8')))
	}
}
