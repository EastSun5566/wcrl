# WCrl

> Ultra-minimal recursive web crawler

## Features

- Simple CLI
- BFS recursive crawling
- CSS selector support
- Output to JSON or Markdown
- Media extraction (images, videos)

## Usage

```sh
npx wcrl http://example.com
```

more examples:

```sh
npx wcrl https://example.com --format markdown --max 30
```

## Options

```sh
npx wcrl --help

wcrl/0.1.0

Usage:
  $ wcrl <url>

Commands:
  <url>  URL to start crawling

For more info, run any command with the `--help` flag:
  $ wcrl --help

Options:
  -s, --selector <selector>  CSS selector to extract content (default: body)
  -o, --output <file>        Output file (default: output.json)
  -m, --max <number>         Maximum pages to crawl (default: 10)
  --match <pattern>          URL pattern to match (supports * and **)
  -f, --format <format>      Output format: json or markdown (default: json)
  -h, --help                 Display this message
  -v, --version              Display version number

Examples:
wcrl https://example.com
wcrl https://example.com --format markdown
wcrl https://example.com -selector "article" -max 50
wcrl https://blog.com --match "https://blog.com/posts/**"
```
