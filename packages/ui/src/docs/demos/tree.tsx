import { File, Folder, Image, Music, Video } from 'lucide-react'
import { Sizer } from '../../components/sizer'
import { Stack } from '../../components/stack'
import { Tree, TreeItem } from '../../components/tree'
import { Example } from '../components/example'

export const meta = { category: 'Data Display' }

export default function TreeDemo() {
	return (
		<Stack gap={8}>
			<Example title="Default">
				<Sizer>
					<Tree>
						<TreeItem label="Documents" icon={<Folder />}>
							<TreeItem label="report.pdf" icon={<File />} />
							<TreeItem label="budget.xlsx" icon={<File />} />
						</TreeItem>
						<TreeItem label="Photos" icon={<Folder />}>
							<TreeItem label="vacation.jpg" icon={<Image />} />
						</TreeItem>
					</Tree>
				</Sizer>
			</Example>

			<Example title="Nested">
				<Sizer>
					<Tree>
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
				</Sizer>
			</Example>

			<Example title="Rich content">
				<Sizer>
					<Tree>
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
				</Sizer>
			</Example>

			<Example title="Colored icons">
				<Sizer>
					<Tree>
						<TreeItem label="Media" icon={<Folder />} color="amber" defaultOpen>
							<TreeItem label="Images" icon={<Image />} color="sky">
								<TreeItem label="photo-001.png" icon={<Image />} color="sky" />
								<TreeItem label="photo-002.png" icon={<Image />} color="sky" />
							</TreeItem>
							<TreeItem label="Music" icon={<Music />} color="rose">
								<TreeItem label="track-01.mp3" icon={<Music />} color="rose" />
							</TreeItem>
							<TreeItem label="Videos" icon={<Video />} color="violet">
								<TreeItem label="clip.mp4" icon={<Video />} color="violet" />
							</TreeItem>
							<TreeItem label="Documents" icon={<File />} color="lime">
								<TreeItem label="notes.txt" icon={<File />} color="lime" />
							</TreeItem>
						</TreeItem>
					</Tree>
				</Sizer>
			</Example>

			<Example title="Without icons">
				<Sizer>
					<Tree>
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
				</Sizer>
			</Example>
		</Stack>
	)
}
