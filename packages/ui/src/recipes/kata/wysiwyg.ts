/**
 * Wysiwyg kata: the frame and the editable field of `<Wysiwyg>`, and the row
 * of its toolbar. It extends the `multiline` group, as Textarea does, so the
 * two fields have one frame, one floor, and one actions row.
 *
 * The field is a `contenteditable` element, so it grows with its content and
 * needs no script to fit it. A zero-width float of `--wysiwyg-rows` lines is
 * the strut of its minimum height, as the strut of the Textarea skeleton is.
 * The field is a `flow-root`, so the float sets its height. The placeholder is
 * the `::before` of the first block of an empty field, and its text is the
 * `--wysiwyg-placeholder` string of the field.
 */
import { defineKata } from '../../core/recipe'
import { hannou, kokkaku } from '../kiso'
import { multiline } from '../kumi/control'

export { scale } from '../kumi/control'

const { textarea } = kokkaku
const { disabled } = hannou

export const k = defineKata(
	{
		extends: multiline,
		/**
		 * The field is not a native control, so the frame reads its disabled state
		 * from its own `data-disabled`, and it dims as the frame of a disabled
		 * textarea does.
		 */
		base: disabled.base,
		slots: {
			/** The element that holds the field, and the markup of the server render before the editor loads. */
			host: 'block w-full min-w-0',
			field: {
				base: [
					'flow-root cursor-text',
					// The text rules that the editor needs: kept spaces, wrapped words, and
					// no ligatures, so the caret sits between the drawn characters.
					'whitespace-break-spaces wrap-break-word [font-variant-ligatures:none]',
					// The first and the last block sit flush with the padding. The items of a
					// tight list hold their text with no paragraph space, as Markdown draws them.
					'[&>:first-child]:mt-0 [&>:last-child]:mb-0',
					'[&_[data-tight]>li>p]:my-0',
					// A `max-height` class caps the growth, and the field then scrolls.
					'overflow-y-auto',
					// The strut of the minimum height.
					"before:float-start before:h-[calc(var(--wysiwyg-rows,1)*1lh)] before:w-0 before:content-['']",
					// The placeholder.
					'[&[data-empty]>:first-child]:before:pointer-events-none',
					'[&[data-empty]>:first-child]:before:absolute',
					'[&[data-empty]>:first-child]:before:content-(--wysiwyg-placeholder)',
					// The marks of the editor: its selected node, its hidden selection, and
					// the separator image that it puts beside an inline node.
					'[&_.ProseMirror-selectednode]:outline-2 [&_.ProseMirror-selectednode]:outline-blue-500',
					'[&.ProseMirror-hideselection]:caret-transparent',
					'[&.ProseMirror-hideselection_*]:selection:bg-transparent',
					'[&_img.ProseMirror-separator]:inline [&_img.ProseMirror-separator]:m-0 [&_img.ProseMirror-separator]:border-0',
				],
				/**
				 * The placeholder takes the placeholder colors of the control reset, and
				 * the stronger ones of a `soft` field.
				 */
				variant: {
					default: [
						'[&[data-empty]>:first-child]:before:text-zinc-500',
						'dark:[&[data-empty]>:first-child]:before:text-zinc-400',
					],
					outline: [
						'[&[data-empty]>:first-child]:before:text-zinc-500',
						'dark:[&[data-empty]>:first-child]:before:text-zinc-400',
					],
					soft: [
						'[&[data-empty]>:first-child]:before:text-zinc-600',
						'dark:[&[data-empty]>:first-child]:before:text-zinc-300',
					],
					glass: [
						'[&[data-empty]>:first-child]:before:text-zinc-500',
						'dark:[&[data-empty]>:first-child]:before:text-zinc-400',
					],
					bare: [
						'[&[data-empty]>:first-child]:before:text-zinc-500',
						'dark:[&[data-empty]>:first-child]:before:text-zinc-400',
					],
				},
			},
			/**
			 * The toolbar above the field. Its padding mirrors the actions row below
			 * the field, and the Toolbar sets its gap.
			 */
			toolbar: 'ps-2 pe-2 pt-2',
		},
	},
	{ skeleton: textarea },
)
