import { Textarea, type TextareaProps } from 'ui/textarea'

export default function TextareaPlayground(props: TextareaProps) {
	return <Textarea aria-label="Comment" placeholder="Leave a comment" {...props} />
}
