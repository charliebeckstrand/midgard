import { File, Folder, Image, Music, Settings, Video } from 'lucide-react'
import { Tree, TreeItem } from '../../components/tree'
import { code } from '../code'
import { Example } from '../components/example'

export const meta = { category: 'Data Display' }

export default function TreeDemo() {
	return (
		<div className="space-y-8">
			<Example
				title="Default"
				code={code`
					import { Tree, TreeItem } from 'ui/tree'
					import { Folder, File, Image } from 'lucide-react'

					<Tree>
						<TreeItem label="Documents" icon={<Folder />} defaultOpen>
							<TreeItem label="report.pdf" icon={<File />} />
							<TreeItem label="budget.xlsx" icon={<File />} />
						</TreeItem>
						<TreeItem label="Photos" icon={<Folder />}>
							<TreeItem label="vacation.jpg" icon={<Image />} />
						</TreeItem>
					</Tree>
				`}
			>
				<Tree className="max-w-xs">
					<TreeItem label="Documents" icon={<Folder />} defaultOpen>
						<TreeItem label="report.pdf" icon={<File />} />
						<TreeItem label="budget.xlsx" icon={<File />} />
					</TreeItem>
					<TreeItem label="Photos" icon={<Folder />}>
						<TreeItem label="vacation.jpg" icon={<Image />} />
					</TreeItem>
				</Tree>
			</Example>

			<Example
				title="Nested"
				code={code`
					import { Tree, TreeItem } from 'ui/tree'

					<Tree>
						<TreeItem label="src" defaultOpen>
							<TreeItem label="components" defaultOpen>
								<TreeItem label="Button.tsx" />
								<TreeItem label="Input.tsx" />
							</TreeItem>
							<TreeItem label="hooks">
								<TreeItem label="useAuth.ts" />
							</TreeItem>
							<TreeItem label="index.ts" />
						</TreeItem>
					</Tree>
				`}
			>
				<Tree className="max-w-xs">
					<TreeItem label="src" icon={<Folder />} defaultOpen>
						<TreeItem label="components" icon={<Folder />} defaultOpen>
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

			<Example
				title="Rich content"
				code={code`
					import { Tree, TreeItem } from 'ui/tree'
					import { Folder, Image, Music, Video, Settings } from 'lucide-react'

					<Tree>
						<TreeItem label="Media" icon={<Folder />} defaultOpen>
							<TreeItem label="Images" icon={<Image />} />
							<TreeItem label="Music" icon={<Music />} />
							<TreeItem label="Videos" icon={<Video />} />
						</TreeItem>
						<TreeItem label="Settings" icon={<Settings />} />
					</Tree>
				`}
			>
				<Tree className="max-w-xs">
					<TreeItem label="Media" icon={<Folder />} defaultOpen>
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
					<TreeItem label="Settings" icon={<Settings />} />
				</Tree>
			</Example>

			<Example title="Without icons">
				<Tree className="max-w-xs">
					<TreeItem label="Animals" defaultOpen>
						<TreeItem label="Mammals" defaultOpen>
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
		</div>
	)
}
