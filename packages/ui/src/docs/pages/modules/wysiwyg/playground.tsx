import { Wysiwyg, type WysiwygProps, WysiwygToolbar } from 'ui/wysiwyg'

export default function WysiwygPlayground(props: WysiwygProps) {
	return (
		<Wysiwyg aria-label="Message" placeholder="Write a message" {...props}>
			<WysiwygToolbar />
		</Wysiwyg>
	)
}
