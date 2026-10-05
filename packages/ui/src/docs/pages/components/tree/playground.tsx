import { File, Folder, Image } from 'lucide-react'
import { Tree, TreeItem, type TreeProps } from 'ui/tree'

export default function TreePlayground(props: TreeProps) {
	return (
		<Tree aria-label="Files" {...props}>
			<TreeItem label="Documents" icon={<Folder />} defaultOpen>
				<TreeItem label="report.pdf" icon={<File />} />
				<TreeItem label="budget.xlsx" icon={<File />} />
			</TreeItem>
			<TreeItem label="Photos" icon={<Folder />}>
				<TreeItem label="vacation.jpg" icon={<Image />} />
			</TreeItem>
		</Tree>
	)
}
