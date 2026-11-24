import type { Node } from 'prosemirror-model'
import type { MarkdownRange } from '../../../../components/markdown/markdown-ranges'
import { markdownDoc } from '../../wysiwyg-markdown-doc'
import { schema } from '../wysiwyg-schema'

/**
 * The doc of a Markdown source, as a ProseMirror node of the schema. The doc
 * comes from {@link markdownDoc}, which the markup before the editor loads
 * draws too, so the two read a source in one way.
 *
 * @internal
 */
export function parseMarkdown(source: string, ranges?: readonly MarkdownRange[]): Node {
	return schema.nodeFromJSON(markdownDoc(source, ranges))
}
