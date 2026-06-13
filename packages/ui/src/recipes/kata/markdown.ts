// Prose styling for the HTML that `marked` emits. The Markdown component drops
// the parsed HTML into a single wrapper `<div>`; these descendant utilities
// style the generated elements. There is no top-level variants axis — one
// curated prose surface — so the kata is a plain object literal (kata README §2).
export const k = {
	base: [
		// Secondary body tone; first/last child margins collapse so the block sits
		// flush in its container (API-reference rows, Example previews).
		'text-sm/6 text-zinc-600 dark:text-zinc-400',
		'[&>:first-child]:mt-0 [&>:last-child]:mb-0',

		// Headings
		'[&_h1]:mt-6 [&_h1]:mb-3 [&_h1]:text-xl [&_h1]:font-semibold [&_h1]:text-zinc-900 dark:[&_h1]:text-white',
		'[&_h2]:mt-6 [&_h2]:mb-3 [&_h2]:text-lg [&_h2]:font-semibold [&_h2]:text-zinc-900 dark:[&_h2]:text-white',
		'[&_h3]:mt-5 [&_h3]:mb-2 [&_h3]:text-base [&_h3]:font-semibold [&_h3]:text-zinc-900 dark:[&_h3]:text-white',
		'[&_h4]:mt-4 [&_h4]:mb-2 [&_h4]:text-sm [&_h4]:font-semibold [&_h4]:text-zinc-900 dark:[&_h4]:text-white',

		// Paragraphs, emphasis, links
		'[&_p]:my-3',
		'[&_strong]:font-semibold [&_strong]:text-zinc-900 dark:[&_strong]:text-white',
		'[&_em]:italic',
		'[&_del]:line-through',
		'[&_a]:font-medium [&_a]:text-blue-600 dark:[&_a]:text-blue-400 [&_a]:underline [&_a]:underline-offset-2 [&_a:hover]:text-blue-500',

		// Lists; nested lists and task-list items tighten up.
		'[&_ul]:my-3 [&_ul]:list-disc [&_ul]:pl-5',
		'[&_ol]:my-3 [&_ol]:list-decimal [&_ol]:pl-5',
		'[&_li]:my-1',
		'[&_li>ul]:my-1 [&_li>ol]:my-1',
		'[&_li:has(input)]:list-none [&_li_input]:mr-2',

		// Inline code
		'[&_code]:rounded [&_code]:bg-zinc-100 dark:[&_code]:bg-white/10 [&_code]:px-1.5 [&_code]:py-0.5 [&_code]:font-mono [&_code]:text-[0.85em] [&_code]:text-zinc-900 dark:[&_code]:text-zinc-100',

		// Fenced code blocks — reset the inline-code chrome on the nested `<code>`.
		'[&_pre]:my-4 [&_pre]:overflow-x-auto [&_pre]:rounded-lg [&_pre]:bg-zinc-900 [&_pre]:p-4 [&_pre]:text-sm/6 [&_pre]:text-zinc-100',
		'[&_pre_code]:bg-transparent [&_pre_code]:p-0 [&_pre_code]:text-inherit',

		// Blockquote, rule
		'[&_blockquote]:my-4 [&_blockquote]:border-l-2 [&_blockquote]:border-zinc-300 dark:[&_blockquote]:border-zinc-700 [&_blockquote]:pl-4 [&_blockquote]:italic [&_blockquote]:text-zinc-500 dark:[&_blockquote]:text-zinc-400',
		'[&_hr]:my-6 [&_hr]:border-zinc-200 dark:[&_hr]:border-zinc-800',

		// Tables (GFM)
		'[&_table]:my-4 [&_table]:w-full [&_table]:text-left',
		'[&_th]:border-b [&_th]:border-zinc-300 dark:[&_th]:border-zinc-700 [&_th]:px-3 [&_th]:py-2 [&_th]:font-semibold [&_th]:text-zinc-900 dark:[&_th]:text-white',
		'[&_td]:border-b [&_td]:border-zinc-200 dark:[&_td]:border-zinc-800 [&_td]:px-3 [&_td]:py-2',

		// Images
		'[&_img]:my-4 [&_img]:max-w-full [&_img]:rounded-lg',
	],
} as const
