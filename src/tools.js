import {
  ArrowsRightLeftIcon,
  CircleStackIcon,
  DocumentPlusIcon,
  SparklesIcon,
  KeyIcon,
  LockClosedIcon,
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
        name: 'AES KeyGen',
        path: '/aes-key',
        desc: 'Generate random AES keys',
        icon: KeyIcon,
      },
      {
        name: 'Crypto',
        path: '/crypto',
        desc: 'AES encrypt/decrypt, hash & HMAC',
        icon: LockClosedIcon,
      },
      {
        name: 'Diff',
        path: '/diff',
        desc: 'Text comparison with character-level diff and inline highlighting',
        icon: DocumentPlusIcon,
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
    ],
  },
]
