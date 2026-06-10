# Wxsm's Tools

[![CI](https://github.com/wxsms/tools/actions/workflows/ci.yaml/badge.svg)](https://github.com/wxsms/tools/actions/workflows/ci.yaml)
[![Coverage](https://codecov.io/gh/wxsms/tools/branch/master/graph/badge.svg)](https://codecov.io/gh/wxsms/tools)

Personal toolkit built with Vue 3 + Vite + Tailwind CSS + DaisyUI.

## Tools

| Tool | Description |
|------|-------------|
| [Base64 Converter](https://wxsms.github.io/tools/base64) | Encode and decode Base64 with Unicode support |
| [Gzip Encoder / Decoder](https://wxsms.github.io/tools/gzip) | Gzip compress text, output as Base64 |
| [MD5 Hash](https://wxsms.github.io/tools/md5) | Compute MD5 hash of text |
| [Text Diff](https://wxsms.github.io/tools/diff) | Compare texts with line-level diff and inline highlighting |

## Development

```bash
npm install
npm run dev
```

## Scripts

| Command | Description |
|---------|-------------|
| `npm run dev` | Start development server |
| `npm run build` | Production build |
| `npm run lint` | ESLint check |
| `npm run lint:fix` | ESLint auto-fix |
| `npm run test` | Run tests |
| `npm run test:watch` | Run tests in watch mode |

## Tech Stack

- [Vue 3](https://vuejs.org/) + [Vue Router](https://router.vuejs.org/)
- [Vite](https://vite.dev/)
- [Tailwind CSS](https://tailwindcss.com/) + [DaisyUI](https://daisyui.com/)
- [Vitest](https://vitest.dev/)

## License

MIT
