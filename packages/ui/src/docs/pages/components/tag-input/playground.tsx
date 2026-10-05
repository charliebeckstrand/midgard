import { TagInput, type TagInputProps } from 'ui/tag-input'

export default function TagInputPlayground(props: TagInputProps) {
	return <TagInput aria-label="Skills" defaultValue={['React', 'TypeScript']} {...props} />
}
