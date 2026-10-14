/** Props of {@link InlineScript}. @internal */
export type InlineScriptProps = {
	/**
	 * The source of the script. Build it from constants and from values that
	 * `JSON.stringify` encodes. Never put a value from a user in it.
	 */
	source: string
	/** The `id` of the script element. */
	id?: string
}

/**
 * A `<script>` element that runs where the parser meets it, before React
 * hydrates. React escapes a text child, so the source goes in as raw HTML.
 * This is the one place in the package that writes a script as raw HTML.
 *
 * It has no `'use client'` and reads no context, so a server component and a
 * client component can each render it.
 *
 * @internal
 */
export function InlineScript({ source, id }: InlineScriptProps) {
	// biome-ignore lint/security/noDangerouslySetInnerHtml: each caller builds the source from constants and JSON-encoded values that it owns (see `source`).
	return <script id={id} dangerouslySetInnerHTML={{ __html: source }} />
}
