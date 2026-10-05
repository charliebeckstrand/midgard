import { Tree, TreeItem } from 'ui/tree'

export default function WithoutIcons() {
	return (
		<Tree aria-label="Animal taxonomy">
			<TreeItem label="Animals">
				<TreeItem label="Mammals">
					<TreeItem label="Dog" />
					<TreeItem label="Cat" />
				</TreeItem>
				<TreeItem label="Birds">
					<TreeItem label="Eagle" />
					<TreeItem label="Sparrow" />
				</TreeItem>
			</TreeItem>
		</Tree>
	)
}
