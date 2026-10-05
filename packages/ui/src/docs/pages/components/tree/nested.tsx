import { File, Folder } from 'lucide-react'
import { Tree, TreeItem } from 'ui/tree'

export default function Nested() {
	return (
		<Tree aria-label="Project files">
			<TreeItem label="src" icon={<Folder />}>
				<TreeItem label="components" icon={<Folder />}>
					<TreeItem label="Button.tsx" icon={<File />} />
					<TreeItem label="Input.tsx" icon={<File />} />
				</TreeItem>
				<TreeItem label="hooks" icon={<Folder />}>
					<TreeItem label="useAuth.ts" icon={<File />} />
				</TreeItem>
				<TreeItem label="index.ts" icon={<File />} />
			</TreeItem>
		</Tree>
	)
}
