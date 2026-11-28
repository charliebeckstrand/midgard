import { Copy, Pencil, Trash } from 'lucide-react'
import { useMemo, useState } from 'react'
import { ContextMenu, type ContextMenuItem } from 'ui/context-menu'
import { Text } from 'ui/text'

export default function WithActions() {
	const [action, setAction] = useState<string>()

	const items = useMemo<ContextMenuItem[]>(
		() => [
			{ key: 'rename', label: 'Rename', icon: <Pencil />, onAction: () => setAction('rename') },
			{
				key: 'duplicate',
				label: 'Duplicate',
				icon: <Copy />,
				onAction: () => setAction('duplicate'),
			},
			{ key: 'delete', label: 'Delete', icon: <Trash />, disabled: true },
		],
		[],
	)

	const label = items.find((item) => item.key === action)?.label

	return (
		<>
			<ContextMenu aria-label="File actions" items={items}>
				{/* biome-ignore lint/a11y/useSemanticElements: a fieldset is a form part, and the box holds no field. */}
				<div
					role="group"
					aria-label="quarterly-report.pdf"
					// biome-ignore lint/a11y/noNoninteractiveTabindex: the box holds no control, so a keyboard opens the menu from the box.
					tabIndex={0}
					className="flex items-center justify-center rounded-lg border border-dashed border-zinc-300 px-10 py-8 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-blue-600 dark:border-zinc-700 dark:focus-visible:outline-blue-500"
				>
					<Text className="select-none">quarterly-report.pdf</Text>
				</div>
			</ContextMenu>
			<Text>Last action: {label ?? 'None'}</Text>
		</>
	)
}
