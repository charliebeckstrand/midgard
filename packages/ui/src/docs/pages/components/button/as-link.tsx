import { Button } from 'ui/button'

// With `href`, the button renders a `<Link>` anchor. A link takes no part in
// the lock of a submitting form.
export default function AsLink() {
	return (
		<Button href="/link" variant="outline">
			Read about links
		</Button>
	)
}
