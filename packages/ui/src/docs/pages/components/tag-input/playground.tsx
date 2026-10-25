import { TagInput, type TagInputProps } from 'ui/tag-input'
import { topics } from '../../../data/topics.ts'

export default function TagInputPlayground(props: TagInputProps) {
	return (
		<TagInput aria-label="Skills" defaultValue={[topics.research, topics.writing]} {...props} />
	)
}
