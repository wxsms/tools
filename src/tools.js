import {
  ArrowsRightLeftIcon,
  CircleStackIcon,
  FingerPrintIcon,
  DocumentPlusIcon,
  SparklesIcon,
  KeyIcon,
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
        name: 'MD5',
        path: '/md5',
        desc: 'MD5 hash computation',
        icon: FingerPrintIcon,
      },
      {
        name: 'AES KeyGen',
        path: '/aes-key',
        desc: 'Generate random AES keys',
        icon: KeyIcon,
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
