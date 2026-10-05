import { Folder, Image, Music, Video } from 'lucide-react'
import { Tree, TreeItem } from 'ui/tree'

export default function RichContent() {
	return (
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
	)
}
