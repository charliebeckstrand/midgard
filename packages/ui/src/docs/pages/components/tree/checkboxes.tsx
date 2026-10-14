import { File, Folder } from 'lucide-react'
import { useState } from 'react'
import { Tree, TreeItem } from 'ui/tree'

const sources = ['Button.tsx', 'Input.tsx', 'index.ts']

export default function Checkboxes() {
	const [picked, setPicked] = useState<ReadonlySet<string>>(() => new Set(['Button.tsx']))

	const partial = picked.size > 0 ? 'mixed' : false

	const branch = picked.size === sources.length ? true : partial

	const pick = (name: string) => (checked: boolean) =>
		setPicked((prev) => {
			const next = new Set(prev)

			if (checked) next.add(name)
			else next.delete(name)

			return next
		})

	return (
		<Tree aria-label="Files to commit">
			<TreeItem
				label="src"
				icon={<Folder />}
				defaultOpen
				checked={branch}
				onCheckedChange={(checked) => setPicked(new Set(checked ? sources : []))}
			>
				{sources.map((name) => (
					<TreeItem
						key={name}
						label={name}
						icon={<File />}
						checked={picked.has(name)}
						onCheckedChange={pick(name)}
					/>
				))}
			</TreeItem>
		</Tree>
	)
}
