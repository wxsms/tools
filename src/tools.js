import {
  ArrowsRightLeftIcon,
  CircleStackIcon,
  CodeBracketSquareIcon,
  DocumentPlusIcon,
  SparklesIcon,
  LockClosedIcon,
  PaperClipIcon,
  KeyIcon,
  LinkIcon,
  LanguageIcon,
  ClockIcon,
  DocumentTextIcon,
  QrCodeIcon,
  MagnifyingGlassIcon,
  FingerPrintIcon,
  SwatchIcon,
  GlobeAltIcon,
  PhotoIcon,
} from '@heroicons/vue/24/outline'

export const toolGroups = [
  {
    name: '编码',
    tools: [
      {
        name: 'UUID 生成',
        path: '/uuid',
        desc: '批量生成 UUID v4，支持大写与无连字符',
        icon: FingerPrintIcon,
      },
      {
        name: 'HTML 实体编码',
        path: '/html-entity',
        desc: 'HTML 特殊字符与实体互转',
        icon: CodeBracketSquareIcon,
      },
      {
        name: '密码生成',
        path: '/password',
        desc: '可配置长度、字符集的随机密码生成器',
        icon: KeyIcon,
      },
    ],
  },
  {
    name: '文本',
    tools: [
      {
        name: 'Base64 转换',
        path: '/base64',
        desc: 'Base64 编码与解码',
        icon: ArrowsRightLeftIcon,
      },
      {
        name: 'Gzip 压缩',
        path: '/gzip',
        desc: 'Gzip 压缩与解压（Base64 表示）',
        icon: CircleStackIcon,
      },
      {
        name: '加密解密',
        path: '/crypto',
        desc: 'AES 加解密、哈希与 HMAC',
        icon: LockClosedIcon,
      },
      {
        name: 'RSA 加密',
        path: '/rsa',
        desc: 'RSA 密钥生成、加密与解密',
        icon: KeyIcon,
      },
      {
        name: '文本对比',
        path: '/diff',
        desc: '文本对比，支持字符级差异与行内高亮',
        icon: DocumentPlusIcon,
      },
      {
        name: 'JSON 校验',
        path: '/json',
        desc: 'JSON 校验、树形查看、格式化、压缩、Unicode 与转义转换',
        icon: CodeBracketSquareIcon,
      },
      {
        name: 'URL 编码',
        path: '/url-encode',
        desc: 'URL 编码与解码，支持批量处理',
        icon: LinkIcon,
      },
      {
        name: '正则测试',
        path: '/regex',
        desc: '正则表达式实时测试与匹配高亮',
        icon: MagnifyingGlassIcon,
      },
      {
        name: '大小写转换',
        path: '/case',
        desc: '大小写转换与编程命名风格转换',
        icon: LanguageIcon,
      },
      {
        name: '时间戳转换',
        path: '/timestamp',
        desc: 'Unix 时间戳 ↔ 日期时间转换（10 位 / 13 位）',
        icon: ClockIcon,
      },
      {
        name: 'Markdown 转换',
        path: '/md-html',
        desc: 'Markdown ↔ HTML 双向转换',
        icon: DocumentTextIcon,
      },
      {
        name: '颜色转换',
        path: '/color-picker',
        desc: 'HEX / RGB / HSL 颜色互转与预览',
        icon: SwatchIcon,
      },
    ],
  },
  {
    name: '网络',
    tools: [
      {
        name: 'IP 查询',
        path: '/ip-lookup',
        desc: '查询 IP 地址归属地信息',
        icon: GlobeAltIcon,
      },
    ],
  },
  {
    name: '图片',
    tools: [
      {
        name: '图片水印',
        path: '/watermark',
        desc: '为图片添加透明文字水印',
        icon: SparklesIcon,
      },
      {
        name: '文件转 Base64',
        path: '/file-base64',
        desc: '文件与 Base64 互转，支持图片预览',
        icon: PaperClipIcon,
      },
      {
        name: '二维码生成',
        path: '/qr-code',
        desc: '将文本或链接生成二维码，支持自定义颜色与纠错级别',
        icon: QrCodeIcon,
      },
      {
        name: '图片处理',
        path: '/image-compress',
        desc: '图片压缩、缩放与格式转换',
        icon: PhotoIcon,
      },
    ],
  },
]
