import { File, Folder, Image, Music, Video } from 'lucide-react'
import { Tree, TreeItem } from '../../../components/tree'
import { Axes, Example } from '../../engine'

export function Demo() {
	return (
		<>
			<Axes
				of="Tree"
				omit={['mount']}
				render={(props, label) => (
					<Tree {...props} aria-label={label}>
						<TreeItem label="Documents" icon={<Folder />} defaultOpen>
							<TreeItem label="report.pdf" icon={<File />} />
							<TreeItem label="budget.xlsx" icon={<File />} />
						</TreeItem>
						<TreeItem label="Photos" icon={<Folder />}>
							<TreeItem label="vacation.jpg" icon={<Image />} />
						</TreeItem>
					</Tree>
				)}
			/>

			<Example title="Nested">
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
			</Example>

			<Example title="Rich content">
				<Tree aria-label="Media library">
					<TreeItem label="Media" icon={<Folder />}>
						<TreeItem label="Images" icon={<Image />}>
							<TreeItem label="photo-001.png" icon={<Image />} />
							<TreeItem label="photo-002.png" icon={<Image />} />
						</TreeItem>
						<TreeItem label="Music" icon={<Music />}>
							<TreeItem label="track-01.mp3" icon={<Music />} />
						</TreeItem>
						<TreeItem label="Videos" icon={<Video />}>
							<TreeItem label="clip.mp4" icon={<Video />} />
						</TreeItem>
					</TreeItem>
				</Tree>
			</Example>

			<Example title="Without icons">
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
			</Example>
		</>
	)
}
