import type { CallableApi } from 'docs-extractor'
import { Heading } from 'ui/heading'
import { Stack } from 'ui/stack'
import { DocDescription } from './doc-description'

/**
 * A hook or function export, rendered as a minimal placeholder for now: a
 * monospace `name()` heading over the description. The params / returns
 * renderer for {@link CallableApi.signatures} lands in the next phase and
 * extends only this file.
 */
export function CallableEntry({ entry }: { entry: CallableApi }) {
	return (
		<Stack gap="sm">
			<Heading level={3} className="font-mono">{`${entry.name}()`}</Heading>
			{entry.description && <DocDescription description={entry.description} />}
		</Stack>
	)
}
