export default {
	extends: ['@commitlint/config-conventional'],
	rules: {
		'scope-enum': [2, 'always', ['admin', 'auth', 'docs', 'shared', 'ui', 'midgard']],
	},
};
