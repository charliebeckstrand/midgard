import { DD, DL, DT } from '../../components/dl'

export const meta = { category: 'Data Display' }

export default function DLDemo() {
	return (
		<DL>
			<DT>Name</DT>
			<DD>Wade Cooper</DD>
			<DT>Email</DT>
			<DD>wade@example.com</DD>
			<DT>Role</DT>
			<DD>Administrator</DD>
			<DT>Status</DT>
			<DD>Active</DD>
		</DL>
	)
}
