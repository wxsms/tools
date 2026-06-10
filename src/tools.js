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
} from '@heroicons/vue/24/outline'

export const toolGroups = [
  {
    name: 'Text',
    tools: [
      {
        name: 'Base64',
        path: '/base64',
        desc: 'Base64 encoding and decoding',
        icon: ArrowsRightLeftIcon,
      },
      {
        name: 'Gzip',
        path: '/gzip',
        desc: 'Gzip compression & decompression (Base64 representation)',
        icon: CircleStackIcon,
      },
      {
        name: 'Crypto',
        path: '/crypto',
        desc: 'AES encrypt/decrypt, hash & HMAC',
        icon: LockClosedIcon,
      },
      {
        name: 'RSA',
        path: '/rsa',
        desc: 'RSA key generation, encryption & decryption',
        icon: KeyIcon,
      },
      {
        name: 'Diff',
        path: '/diff',
        desc: 'Text comparison with character-level diff and inline highlighting',
        icon: DocumentPlusIcon,
      },
      {
        name: 'JSON',
        path: '/json',
        desc: 'JSON validation, tree view, format, minify, unicode & escape conversion',
        icon: CodeBracketSquareIcon,
      },
      {
        name: 'URL Encode',
        path: '/url-encode',
        desc: 'URL encoding and decoding with batch support',
        icon: LinkIcon,
      },
      {
        name: 'Case',
        path: '/case',
        desc: 'Case conversion & coding style naming formats',
        icon: LanguageIcon,
      },
      {
        name: 'Timestamp',
        path: '/timestamp',
        desc: 'Unix timestamp ↔ date/time conversion (10 or 13 digits)',
        icon: ClockIcon,
      },
      {
        name: 'Markdown / HTML',
        path: '/md-html',
        desc: 'Markdown ↔ HTML bidirectional conversion',
        icon: DocumentTextIcon,
      },
    ],
  },
  {
    name: 'Image',
    tools: [
      {
        name: 'Watermark',
        path: '/watermark',
        desc: 'Add transparent text watermark to images',
        icon: SparklesIcon,
      },
      {
        name: 'File / Base64',
        path: '/file-base64',
        desc: 'Convert files to Base64 and back, with image preview',
        icon: PaperClipIcon,
      },
    ],
  },
]
