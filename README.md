# MDXLD Build Action

GitHub Action to Build MDXLD files as an ES Module & Optionally Publish as an NPM Package.

This action automates the process of building and bundling MDXLD files into ES Modules using the `mdxld build` command. It can be used as part of your CI/CD pipeline to generate ES Modules from your MDX content.

## Usage

### Basic Usage

```yaml
steps:
  - uses: actions/checkout@v4
  - name: Build MDXLD files
    uses: mdxld/action@v1
```

### With Custom Options

```yaml
steps:
  - uses: actions/checkout@v4
  - name: Build MDXLD files
    uses: mdxld/action@v1
    with:
      source: "docs/content"
      output: "dist/mdx"
      bundle: "true"
      config: ".mdxld.config.js"
```

## Inputs

| Input | Description | Required | Default |
|-------|-------------|----------|---------|
| `source` | Source directory containing MDX files | No | `content` |
| `output` | Output directory for processed files | No | `.mdx` |
| `config` | Path to config file | No | - |
| `bundle` | Bundle with esbuild | No | `true` |
| `node-version` | Node.js version to use | No | `20.x` |
| `github-token` | GitHub token for TODO sync | No | - |

## Examples

### Basic Build

```yaml
name: Build MDXLD Files

on:
  push:
    branches: [ main ]
  pull_request:
    branches: [ main ]

jobs:
  build:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v4
      - name: Build MDXLD files
        uses: mdxld/action@v1
```

### Publishing to NPM

```yaml
name: Build and Publish MDX Package

on:
  push:
    tags:
      - 'v*'

jobs:
  build-and-publish:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v4
      
      - name: Build MDXLD files
        uses: mdxld/action@v1
        with:
          source: "content"
          output: "dist"
          bundle: "true"
      
      - name: Setup Node.js for NPM
        uses: actions/setup-node@v4
        with:
          node-version: '20.x'
          registry-url: 'https://registry.npmjs.org'
      
      - name: Publish to NPM
        run: npm publish
        env:
          NODE_AUTH_TOKEN: ${{ secrets.NPM_TOKEN }}
```

For more examples, see the [examples directory](./examples).

## Technical Details

This action is designed to work in a CI environment and uses the `mdxld build` command with parameters passed as inputs. It sets up Node.js, installs dependencies (including mdxld), and runs the `mdxld build` command with the specified options.

The following options are supported:
- Source directory (default: 'content')
- Output directory (default: '.mdx')
- Config file path (optional)
- Bundle option (for ES Module output)

The action does not support watch mode in CI since it's not applicable in most CI environments.

## Contributing

Contributions are welcome! Please feel free to submit a Pull Request.

## License

This project is licensed under the MIT License - see the [LICENSE](LICENSE) file for details.
