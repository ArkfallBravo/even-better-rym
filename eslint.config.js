import tseslint from "typescript-eslint";

export default [
	...tseslint.configs.recommendedTypeChecked,
	...tseslint.configs.stylisticTypeChecked,
	{
		languageOptions: {
			parserOptions: {
				projectService: {
					allowDefaultProject: ["eslint.config.js", "vite.config.ts"],
					defaultProject: "./tsconfig.json",
				},
				tsconfigRootDir: import.meta.dirname,
			},
		},
	},
	{
		ignores: [
			"**/.DS_Store",
			"node_modules",
			"build",
			"coverage",
			"dist",
			"profiles",
			"postcss.config.cjs",
		],
	},
	{
		rules: {
			"@typescript-eslint/unbound-method": "off",
			// Destructuring a key next to a rest element is how a key gets
			// omitted from a copy, so that key is never read.
			"@typescript-eslint/no-unused-vars": [
				"error",
				{ ignoreRestSiblings: true },
			],
			"@typescript-eslint/consistent-type-definitions": ["error", "type"],
			"@typescript-eslint/consistent-type-imports": [
				"error",
				{ disallowTypeAnnotations: false },
			],
		},
	},
];
