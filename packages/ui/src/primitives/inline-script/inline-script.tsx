/** Props of {@link InlineScript}. @internal */
export type InlineScriptProps = {
	/**
	 * The source of the script. Build it from constants and from values that
	 * `JSON.stringify` encodes. Never put a value from a user in it, because the
	 * script runs with the full rights of the page.
	 */
	source: string
	/** The `id` of the script element. */
	id?: string
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
 * It has no `'use client'` and reads no context, so a server component and a
 * client component can each render it.
 *
 * @internal
 */
export function InlineScript({ source, id }: InlineScriptProps) {
	return <script id={id}>{source}</script>
}
