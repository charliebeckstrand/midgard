import { SearchInput, type SearchInputProps } from 'ui/search-input'

export default function SearchInputPlayground(props: SearchInputProps) {
	return <SearchInput aria-label="Search projects" placeholder="Search projects" {...props} />
}
