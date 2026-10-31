/** Props of {@link InlineScript}. @internal */
export type InlineScriptProps = {
	/**
	 * The source of the script. Build it from constants, from values that
	 * `JSON.stringify` encodes, and from the text of a function that uses
	 * nothing from outside its body. Never put a value from a user in it,
	 * because the script runs with the full rights of the page.
	 */
	source: string
}

/**
 * A `<script>` element that runs where the parser meets it, before React
 * hydrates. This is the one place in the package that writes a script with
 * inline source.
 *
 * The source is the text child of the element. The server renderer of React
 * writes the text of a script as it is, and it escapes only `<script` and
 * `</script`. Thus the source cannot close the element.
 *
 * The text does nothing after the parser runs it. A source that comes from the
 * text of a function can differ between the server build and the client
 * build, because each minifies the function in its own way. So hydration
 * keeps the text of the server, and does not report the difference.
 *
 * It has no `'use client'` and reads no context, so a server component and a
 * client component can each render it.
 *
 * @internal
 */
export function InlineScript({ source }: InlineScriptProps) {
	return <script suppressHydrationWarning>{source}</script>
}
