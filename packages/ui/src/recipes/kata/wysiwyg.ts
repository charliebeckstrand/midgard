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
import { dan, hannou, kokkaku } from '../kiso'
import { framed, multiline } from '../kumi/control'

export { scale } from '../kumi/control'

const { textarea } = kokkaku
const { disabled } = hannou

/** The variants that draw a frame, and so give the field and the toolbar an inset. */
const FRAMED = ['default', 'outline', 'soft', 'glass'] as const

export const k = defineKata(
	{
		extends: multiline,
		/**
		 * The field is not a native control, so the frame reads its disabled state
		 * from its own `data-disabled`, and it dims as the frame of a disabled
		 * textarea does.
		 */
		base: disabled.base,
		/**
		 * Whether a toolbar is above the field and no row of actions is below it.
		 * The field is then the last row, and its end padding matches the inset of
		 * the toolbar.
		 */
		toolbar: { true: [], false: [] },
		/** Whether the toolbar is above the frame, apart from the field. */
		separated: { true: [], false: [] },
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
					// The held selection: the text or the caret that a popover acts on, such
					// as the link popover, while the focus is out of the field. The text has
					// the color of a selection, and the caret is a line that takes no width.
					'[&_[data-slot=wysiwyg-held]]:bg-[Highlight] [&_[data-slot=wysiwyg-held]]:text-[HighlightText]',
					'[&_[data-slot=wysiwyg-held-caret]]:inline-block [&_[data-slot=wysiwyg-held-caret]]:h-[1lh] [&_[data-slot=wysiwyg-held-caret]]:align-top',
					'[&_[data-slot=wysiwyg-held-caret]]:-me-px [&_[data-slot=wysiwyg-held-caret]]:border-s [&_[data-slot=wysiwyg-held-caret]]:border-current',
					// A range, such as a citation, is a soft pill, as a citation that
					// selects in no view is in a reply. It has no padding, so the caret
					// sits at the edge of its text.
					'[&_[data-slot=wysiwyg-range]]:rounded-sm [&_[data-slot=wysiwyg-range]]:box-decoration-clone',
					'[&_[data-slot=wysiwyg-range]]:font-medium',
					'[&_[data-slot=wysiwyg-range]]:bg-blue-500/15 [&_[data-slot=wysiwyg-range]]:text-blue-700',
					'dark:[&_[data-slot=wysiwyg-range]]:bg-blue-400/20 dark:[&_[data-slot=wysiwyg-range]]:text-blue-300',
					'forced-colors:[&_[data-slot=wysiwyg-range]]:outline-solid forced-colors:[&_[data-slot=wysiwyg-range]]:outline-1',
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
				/**
				 * The end padding of the last row below a toolbar in a framed field: the
				 * inline padding of the field, so the text has the inset of the glyphs
				 * of the toolbar on each side. A bare field has no inset.
				 */
				compound: FRAMED.map((variant) => ({
					variant,
					toolbar: true,
					class: dan.space.control.toolbar.bottom,
				})),
			},
			/**
			 * The toolbar above the field. In a framed field, its padding and the
			 * padding of a bare button add up to the inline padding of the field, so
			 * each glyph of the toolbar has the inset of the text on the top, the
			 * start, and the end. A separated toolbar is above the frame, and it keeps
			 * only the inline padding, so its glyphs line up with the text. A bare
			 * field has no inset, so its toolbar has no padding, and a negative
			 * inline margin cancels the padding of the buttons. The first glyph then
			 * starts at the edge of the text. The Toolbar sets its gap.
			 */
			toolbar: {
				variant: { ...framed(dan.space.control.toolbar.x), bare: dan.space.control.toolbar.bare },
				compound: FRAMED.map((variant) => ({
					variant,
					separated: false,
					class: dan.space.control.toolbar.top,
				})),
			},
			/**
			 * The root of the field. With `separated`, it is the column of the
			 * toolbar and the frame below it. Else it has no box, and the frame is
			 * the box of the field.
			 */
			root: {
				/**
				 * A disabled field shows `not-allowed` over each of its parts, the
				 * field and the toolbar too. The field is not a native control, so the
				 * root reads its own `data-disabled`.
				 */
				base: 'data-disabled:cursor-not-allowed data-disabled:**:cursor-not-allowed',
				separated: { true: ['flex flex-col', dan.gap.scale.sm], false: 'contents' },
			},
		},
		defaults: { toolbar: false, separated: false },
	},
	{ skeleton: textarea },
)
