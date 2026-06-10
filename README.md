# Wxsms Tools

[![CI](https://github.com/wxsms/tools/actions/workflows/ci.yaml/badge.svg)](https://github.com/wxsms/tools/actions/workflows/ci.yaml)
[![Coverage](https://codecov.io/gh/wxsms/tools/branch/master/graph/badge.svg)](https://codecov.io/gh/wxsms/tools)

个人工具集，基于 Vue 3 + Vite + Tailwind CSS + DaisyUI 构建。

## 工具列表

| 工具 | 说明 |
|------|------|
| [Base64 转换](https://wxsms.github.io/tools/base64) | 文本与 Base64 互转，支持 Unicode |
| [Gzip 编码解码](https://wxsms.github.io/tools/gzip) | 文本 Gzip 压缩，结果以 Base64 输出 |
| [MD5 哈希](https://wxsms.github.io/tools/md5) | 计算文本的 MD5 哈希值 |
| [文本 Diff](https://wxsms.github.io/tools/diff) | 文本对比，支持行级差异和行内高亮 |

## 开发

```bash
npm install
npm run dev
```

## 脚本

| 命令 | 说明 |
|------|------|
| `npm run dev` | 启动开发服务器 |
| `npm run build` | 生产构建 |
| `npm run lint` | ESLint 检查 |
| `npm run lint:fix` | ESLint 自动修复 |
| `npm run test` | 运行测试 |
| `npm run test:watch` | 监听模式运行测试 |

## 技术栈

- [Vue 3](https://vuejs.org/) + [Vue Router](https://router.vuejs.org/)
- [Vite](https://vite.dev/)
- [Tailwind CSS](https://tailwindcss.com/) + [DaisyUI](https://daisyui.com/)
- [Vitest](https://vitest.dev/)

## License

MIT
