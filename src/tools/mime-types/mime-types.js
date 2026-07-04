export const MIME_TYPES = [
  // application
  { type: 'application/atom+xml', exts: ['atom'], desc: 'Atom 订阅源', detail: '基于 XML 的 Web 订阅源格式，是 RSS 的替代方案，支持更丰富的元数据和内容类型标识。' },
  { type: 'application/epub+zip', exts: ['epub'], desc: 'EPUB 电子书', detail: '基于 XHTML 和 CSS 的开放电子书标准，内容以 ZIP 打包，支持重排布局以适应不同屏幕尺寸。' },
  { type: 'application/gzip', exts: ['gz'], desc: 'Gzip 压缩文件', detail: 'GNU gzip 压缩格式，通常用于压缩单个文件。在 Web 中常与 tar 配合使用（.tar.gz），也是 HTTP 内容编码的标准方式之一。' },
  { type: 'application/java-archive', exts: ['jar'], desc: 'Java 归档', detail: '基于 ZIP 格式的 Java 归档文件，包含编译后的类文件和资源清单（MANIFEST.MF），用于分发和部署 Java 应用及库。' },
  { type: 'application/javascript', exts: ['js', 'mjs'], desc: 'JavaScript 脚本', detail: 'JavaScript 源代码文件。mjs 扩展名表示 ES Module 格式（使用 import/export），js 默认为 CommonJS 或脚本格式，Node.js 通过此区分模块系统。' },
  { type: 'application/json', exts: ['json'], desc: 'JSON 数据', detail: '轻量级数据交换格式，源自 JavaScript 对象字面量语法。已成为 Web API 最常用的数据格式，支持字符串、数字、布尔值、数组、对象和 null 六种值类型。' },
  { type: 'application/ld+json', exts: ['jsonld'], desc: 'JSON-LD 链接数据', detail: '基于 JSON 的链接数据格式，用于在 JSON 中表达语义网数据。搜索引擎使用其标记网页内容的结构化信息（如文章作者、活动日期），提升搜索结果的富摘要展示。' },
  { type: 'application/msword', exts: ['doc'], desc: 'Word 文档 (旧版)', detail: 'Microsoft Word 97–2003 使用的二进制文件格式（Compound File Binary Format）。已被基于 Open XML 的 docx 格式取代，但仍广泛存在。' },
  { type: 'application/octet-stream', exts: ['bin', 'exe', 'dll', 'so', 'dylib'], desc: '二进制流', detail: '未指定具体类型的二进制数据默认 MIME 类型。exe 为 Windows 可执行文件，dll/so/dylib 分别为 Windows/Linux/macOS 的动态链接库。浏览器通常触发下载而非尝试显示。' },
  { type: 'application/ogg', exts: ['ogx'], desc: 'OGG 容器', detail: 'OGG 通用容器格式，可封装音频、视频及其他数据流。当内容不是纯音频或纯视频时使用此类型，实际中 oga/ogv 更常用。' },
  { type: 'application/pdf', exts: ['pdf'], desc: 'PDF 文档', detail: '由 Adobe 开发的便携式文档格式，可在不同设备和操作系统上保持一致的排版效果，广泛用于正式文档分发和打印。' },
  { type: 'application/php', exts: ['php'], desc: 'PHP 脚本', detail: 'PHP 服务端脚本语言源文件，嵌入 HTML 中在服务器端执行后生成动态页面。PHP 是 WordPress 等主流 CMS 的底层语言。' },
  { type: 'application/pkcs12', exts: ['p12', 'pfx'], desc: 'PKCS#12 证书', detail: 'PKCS#12 标准定义的加密容器，用于存储私钥和配套的 X.509 证书链。pfx 是微软的早期名称，p12 为标准扩展名，两者格式相同。通常需密码保护。' },
  { type: 'application/pkcs7-mime', exts: ['p7c'], desc: 'PKCS#7 MIME', detail: 'PKCS#7（CMS）标准定义的加密或封套数据格式，常用于 S/MIME 邮件加密和证书分发。p7c 扩展名通常表示仅含证书的退化情况。' },
  { type: 'application/pkcs7-signature', exts: ['p7s'], desc: 'PKCS#7 签名', detail: 'PKCS#7 签名数据，用于 S/MIME 邮件的数字签名。p7s 文件包含签名者的证书和签名值，邮件客户端可据此验证发件人身份和内容完整性。' },
  { type: 'application/pkix-cert', exts: ['cer'], desc: 'X.509 证书', detail: 'X.509 公钥证书的 DER 或 PEM 编码格式，包含公钥、持有者信息和 CA 签名。用于 TLS/SSL 证书、代码签名等场景，cer 和 crt 扩展名可互换使用。' },
  { type: 'application/pkix-crl', exts: ['crl'], desc: '证书吊销列表', detail: 'Certificate Revocation List，由 CA 发布的已被吊销证书的列表。客户端可下载 CRL 检查证书是否仍然有效，但因更新延迟和体积问题，OCSP 在线查询更常用。' },
  { type: 'application/postscript', exts: ['ps', 'eps', 'ai'], desc: 'PostScript 文档', detail: 'Adobe PostScript 页面描述语言。ps 用于打印和排版；eps 是封装格式，可嵌入其他文档；ai 是 Adobe Illustrator 的原生格式（早期版本基于 PostScript）。' },
  { type: 'application/rdf+xml', exts: ['rdf'], desc: 'RDF 数据', detail: '资源描述框架（Resource Description Framework）的 XML 序列化格式，用于以主语-谓语-宾语三元组表达语义关系，是语义网和知识图谱的基础数据模型。' },
  { type: 'application/rss+xml', exts: ['rss'], desc: 'RSS 订阅源', detail: 'Really Simple Syndication，基于 XML 的 Web 内容订阅格式。用于发布博客、新闻等更新，用户通过 RSS 阅读器聚合多来源内容，无需逐站访问。' },
  { type: 'application/rtf', exts: ['rtf'], desc: '富文本格式', detail: 'Rich Text Format，微软开发的跨平台文档交换格式，使用纯文本标记描述格式化内容。几乎所有文字处理器都支持读写，适合在不同软件间交换带格式文档。' },
  { type: 'application/sql', exts: ['sql'], desc: 'SQL 脚本', detail: '结构化查询语言脚本文件，包含一条或多条 SQL 语句。常用于数据库初始化、数据迁移和备份恢复，可被 MySQL、PostgreSQL 等数据库引擎执行。' },
  { type: 'application/tar', exts: ['tar'], desc: 'Tar 归档', detail: 'Tape Archive 格式，将多个文件合并为一个未压缩的归档文件。本身不压缩数据，通常与 gzip 或 bzip2 配合使用生成 .tar.gz 或 .tar.bz2。源自 Unix 磁带备份。' },
  { type: 'application/vnd.api+json', exts: ['json'], desc: 'JSON:API 响应', detail: 'JSON:API 规范定义的响应格式，标准化了 JSON API 的资源对象、关系链接和错误结构。使用独立的 MIME 类型以便中间件识别和处理。' },
  { type: 'application/vnd.apple.mpegurl', exts: ['m3u8'], desc: 'HLS 播放列表', detail: 'Apple HLS（HTTP Live Streaming）的播放列表索引文件，指向分段编码的 .ts 视频片段。HLS 是最主流的自适应码率流媒体协议，支持直播和点播。' },
  { type: 'application/vnd.ms-excel', exts: ['xls'], desc: 'Excel 文档 (旧版)', detail: 'Microsoft Excel 97–2003 使用的二进制工作簿格式（Compound File Binary Format）。已被基于 Open XML 的 xlsx 格式取代，单文件最大支持 65536 行。' },
  { type: 'application/vnd.ms-fontobject', exts: ['eot'], desc: 'EOT 字体', detail: 'Embedded Open Type，微软为 Web 嵌入字体设计的格式，支持字体子集化和 DRM 保护。曾用于 IE 浏览器，已被 WOFF/WOFF2 取代。' },
  { type: 'application/vnd.ms-powerpoint', exts: ['ppt'], desc: 'PowerPoint 演示 (旧版)', detail: 'Microsoft PowerPoint 97–2003 使用的二进制演示文稿格式。已被基于 Open XML 的 pptx 格式取代，仍常见于旧文档归档中。' },
  { type: 'application/vnd.oasis.opendocument.presentation', exts: ['odp'], desc: 'ODP 演示文稿', detail: 'OASIS OpenDocument 演示文稿标准格式，LibreOffice Impress 和 OpenOffice 的默认格式。基于 XML 并以 ZIP 打包，是 pptx 的开放替代方案。' },
  { type: 'application/vnd.oasis.opendocument.spreadsheet', exts: ['ods'], desc: 'ODS 电子表格', detail: 'OASIS OpenDocument 电子表格标准格式，LibreOffice Calc 和 OpenOffice 的默认格式。基于 XML 并以 ZIP 打包，是 xlsx 的开放替代方案。' },
  { type: 'application/vnd.oasis.opendocument.text', exts: ['odt'], desc: 'ODT 文本文档', detail: 'OASIS OpenDocument 文本标准格式，LibreOffice Writer 和 OpenOffice 的默认格式。基于 XML 并以 ZIP 打包，是 docx 的开放替代方案。' },
  { type: 'application/vnd.openxmlformats-officedocument.presentationml.presentation', exts: ['pptx'], desc: 'PowerPoint 演示', detail: 'Microsoft Office Open XML 演示文稿格式（2007+），基于 XML 并以 ZIP 打包，包含幻灯片、备注和媒体资源。相比旧版 ppt 格式体积更小、恢复能力更强。' },
  { type: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet', exts: ['xlsx'], desc: 'Excel 文档', detail: 'Microsoft Office Open XML 电子表格格式（2007+），基于 XML 并以 ZIP 打包。行数上限提升至 1048576 行，支持条件格式、数据透视表等高级功能。' },
  { type: 'application/vnd.openxmlformats-officedocument.wordprocessingml.document', exts: ['docx'], desc: 'Word 文档', detail: 'Microsoft Office Open XML 文字处理格式（2007+），基于 XML 并以 ZIP 打包。相比旧版 doc 格式体积更小、结构更开放，损坏后恢复概率更高。' },
  { type: 'application/vnd.rar', exts: ['rar'], desc: 'RAR 压缩文件', detail: 'RARlab 开发的专有压缩格式，通常比 ZIP 压缩率更高，支持分卷压缩和恢复记录。解压需专用工具（如 WinRAR/unar），格式规范未完全公开。' },
  { type: 'application/vnd.visio', exts: ['vsd'], desc: 'Visio 文档', detail: 'Microsoft Visio 二进制绘图格式，用于流程图、网络拓扑图和组织结构图等。已被基于 Open XML 的 vsdx 格式取代。' },
  { type: 'application/x-7z-compressed', exts: ['7z'], desc: '7-Zip 压缩文件', detail: '7-Zip 的高压缩比开源格式，默认使用 LZMA/LZMA2 算法，压缩率通常优于 ZIP 和 RAR。支持 AES-256 加密、分卷和多种算法切换。' },
  { type: 'application/x-bzip', exts: ['bz'], desc: 'Bzip 压缩文件', detail: 'bzip1 压缩格式，使用块排序文本压缩算法。已被压缩率更高的 bzip2 取代，实际中极少遇到。' },
  { type: 'application/x-bzip2', exts: ['bz2'], desc: 'Bzip2 压缩文件', detail: 'bzip2 压缩格式，使用 Burrows-Wheeler 变换和霍夫曼编码，压缩率通常优于 gzip 但速度较慢。常用于 Linux 内核源码和软件包发布（如 .tar.bz2）。' },
  { type: 'application/x-csh', exts: ['csh'], desc: 'C Shell 脚本', detail: 'C Shell（csh/tcsh）脚本文件，语法风格类似 C 语言。主要在 BSD 系统中使用， Bourne Shell（sh）和 Bash 在 Linux 中更为普及。' },
  { type: 'application/x-sh', exts: ['sh'], desc: 'Shell 脚本', detail: 'Bourne Shell 兼容脚本文件，是 Unix/Linux 系统管理和自动化的基础。通常以 #!/bin/sh 或 #!/bin/bash 开头指定解释器。' },
  { type: 'application/x-shockwave-flash', exts: ['swf'], desc: 'Flash 动画', detail: 'Adobe Flash（原 Macromedia Shockwave Flash）的矢量动画格式，曾广泛用于网页交互和视频播放。2020 年底 Adobe 停止支持，主流浏览器已移除 Flash 运行时。' },
  { type: 'application/x-tar', exts: ['tar'], desc: 'Tar 归档', detail: '与 application/tar 相同的 Tape Archive 格式。application/x-tar 为非正式注册的常用类型，实际使用中两者等价。' },
  { type: 'application/x-xz', exts: ['xz'], desc: 'XZ 压缩文件', detail: '基于 LZMA2 算法的高压缩比格式，压缩率优于 bzip2 且解压速度快。是 Linux 发行版中软件包（.deb、.rpm）压缩的主流选择，如 Linux 内核的 .tar.xz 发布。' },
  { type: 'application/xhtml+xml', exts: ['xhtml'], desc: 'XHTML 文档', detail: '符合 XML 语法严格要求的 HTML 版本，要求标签闭合、属性加引号、小写标签名等。因开发体验限制未被广泛采用，HTML5 成为后续标准。' },
  { type: 'application/xml', exts: ['xml', 'xsl'], desc: 'XML 文档', detail: '可扩展标记语言，用于结构化数据的描述和交换。xml 是通用文档，xsl 是 XSLT 样式表，可将 XML 转换为其他格式（如 HTML）。作为 application 类型时表示不面向人类阅读。' },
  { type: 'application/xml-dtd', exts: ['dtd'], desc: 'DTD 定义', detail: 'Document Type Definition，定义 XML 文档的合法元素、属性和嵌套规则。用于验证 XML 文档的结构合法性，现多被更灵活的 XML Schema（XSD）取代。' },
  { type: 'application/zip', exts: ['zip'], desc: 'ZIP 压缩文件', detail: '最通用的压缩归档格式，使用 DEFLATE 算法，几乎所有操作系统都内置支持。也是 docx、xlsx、jar、odt 等格式的底层容器。' },

  // audio
  { type: 'audio/aac', exts: ['aac'], desc: 'AAC 音频', detail: 'Advanced Audio Coding，MP3 的后继格式，同等音质下码率约为 MP3 的 70%。是 Apple 生态和流媒体服务（如 YouTube、Netflix）的默认音频编码。' },
  { type: 'audio/flac', exts: ['flac'], desc: 'FLAC 无损音频', detail: 'Free Lossless Audio Codec，开源无损压缩音频格式，压缩率约 50–70%（相对 PCM），解压后与原始数据完全一致。是音乐爱好者和归档场景的首选无损格式。' },
  { type: 'audio/midi', exts: ['mid', 'midi'], desc: 'MIDI 音乐', detail: 'Musical Instrument Digital Interface，存储音符指令（音高、时长、力度、乐器）而非实际音频波形。文件体积极小，广泛用于电子音乐制作、手机铃声和游戏配乐。' },
  { type: 'audio/mp4', exts: ['m4a', 'mp4a'], desc: 'MP4 音频', detail: 'MP4 容器中的纯音频轨道，通常使用 AAC 编码。m4a 扩展名用于区分不含视频的 MP4 音频文件，Apple iTunes Store 以此格式分发音乐。' },
  { type: 'audio/mpeg', exts: ['mp3', 'mpga'], desc: 'MP3 音频', detail: '有损压缩音频格式，通过去除人耳不易察觉的频段实现高压缩比，是最普及的数字音频格式。' },
  { type: 'audio/ogg', exts: ['oga', 'ogg', 'opus'], desc: 'OGG 音频', detail: 'OGG 容器中的音频流。oga 为纯音频，ogg 通常含 Vorbis 编码，opus 扩展名表示使用 Opus 编码（低延迟、高质量，适合实时通信）。Opus 是 WebRTC 的强制音频编码。' },
  { type: 'audio/wav', exts: ['wav'], desc: 'WAV 音频', detail: '基于 RIFF 容器的音频格式，通常存储未压缩的 PCM 波形数据，音质最高但文件体积大。是音频编辑和专业制作的常用中间格式，Windows 系统原生支持。' },
  { type: 'audio/webm', exts: ['weba'], desc: 'WebM 音频', detail: 'WebM 容器中的纯音频流，使用 Opus 或 Vorbis 编码。weba 扩展名用于区分不含视频的 WebM 音频文件，主要在 Web 平台使用。' },
  { type: 'audio/x-matroska', exts: ['mka'], desc: 'Matroska 音频', detail: 'Matroska 容器中的纯音频流，可封装几乎所有音频编码格式（AAC、FLAC、MP3 等）。mka 扩展名用于区分不含视频的 Matroska 音频文件。' },

  // font
  { type: 'font/otf', exts: ['otf'], desc: 'OpenType 字体', detail: 'OpenType Font 格式，基于 PostScript CFF 轮廓数据，支持丰富的排版特性（连字、替换字形、可变字体等）。是专业排版和多语言字体的事实标准。' },
  { type: 'font/ttf', exts: ['ttf'], desc: 'TrueType 字体', detail: 'TrueType Font 格式，使用二次贝塞尔曲线描述字形轮廓。兼容性最广的字体格式，所有主流操作系统和浏览器均支持，也是 WOFF 的底层格式之一。' },
  { type: 'font/woff', exts: ['woff'], desc: 'WOFF 字体', detail: 'Web Open Font Format，对 TrueType/OpenType 字体进行压缩并添加元数据的 Web 字体格式。比原始字体小约 40%，已被 WOFF2 取代作为首选 Web 字体格式。' },
  { type: 'font/woff2', exts: ['woff2'], desc: 'WOFF2 字体', detail: 'WOFF 的升级版，使用 Brotli 压缩算法，压缩率比 WOFF 提升约 30%。当前 Web 字体的推荐格式，所有现代浏览器均支持。' },

  // image
  { type: 'image/avif', exts: ['avif'], desc: 'AVIF 图片', detail: '基于 AV1 视频编码的图片格式，同画质下体积比 JPEG 小约 50%、比 WebP 小约 20%。支持 HDR、透明通道和动画，是次世代 Web 图片格式中最有潜力的候选。' },
  { type: 'image/bmp', exts: ['bmp'], desc: 'BMP 位图', detail: 'Windows 标准位图格式，通常不压缩存储像素数据，文件体积大。结构简单解析快，常用于嵌入式设备和系统内部图标资源，不适合 Web 传输。' },
  { type: 'image/gif', exts: ['gif'], desc: 'GIF 图片', detail: 'Graphics Interchange Format，使用 LZW 无损压缩的 8 位索引色图片格式。仅支持 256 色和 1 位透明，但支持多帧动画，是 Web 上最常用的动图格式。' },
  { type: 'image/jpeg', exts: ['jpg', 'jpeg'], desc: 'JPEG 图片', detail: 'Joint Photographic Experts Group 制定的有损压缩图片格式，适合照片和渐变图像。压缩比可调，10:1 压缩下通常无明显失真，不支持透明通道。jpg 是 jpeg 的简写扩展名。' },
  { type: 'image/png', exts: ['png'], desc: 'PNG 图片', detail: '支持无损压缩和透明通道的位图格式，是 Web 上最常用的无损图片格式，适合图标、截图和需要透明背景的图像。' },
  { type: 'image/svg+xml', exts: ['svg', 'svgz'], desc: 'SVG 矢量图', detail: '基于 XML 的矢量图形格式，无限缩放不失真，文件体积小且可被文本编辑。svgz 是 gzip 压缩的 SVG，体积更小但需服务器配置 Content-Encoding。广泛用于图标和响应式图形。' },
  { type: 'image/tiff', exts: ['tif', 'tiff'], desc: 'TIFF 图片', detail: 'Tagged Image File Format，灵活的位图格式，支持多种压缩方式（LZW、JPEG、无压缩）和色彩深度。印刷行业和医学影像的标准格式，tif 是 tiff 的短扩展名。' },
  { type: 'image/webp', exts: ['webp'], desc: 'WebP 图片', detail: 'Google 开发的图片格式，同时支持有损和无损压缩、透明通道和动画。有损模式下比 JPEG 小 25–35%，无损模式下比 PNG 小 26%，是 Web 图片的现代替代方案。' },
  { type: 'image/x-icon', exts: ['ico'], desc: 'ICO 图标', detail: 'Windows 图标格式，可包含多种尺寸（16x16 到 256x256）和色深的图标图像。也是网站 favicon 的标准格式，浏览器通过 /favicon.ico 自动加载。' },

  // message
  { type: 'message/http', exts: ['http'], desc: 'HTTP 消息', detail: '完整的 HTTP 请求或响应消息，包含起始行、头部和消息体。主要用于 HTTP 消息的序列化和调试场景，日常开发中很少直接遇到此类型。' },
  { type: 'message/rfc822', exts: ['eml', 'mime'], desc: '电子邮件', detail: 'RFC 822 标准定义的电子邮件消息格式，包含邮件头（发件人、收件人、主题等）和邮件正文。eml 是最常见的邮件导出格式，可被大多数邮件客户端打开。' },

  // model
  { type: 'model/3mf', exts: ['3mf'], desc: '3D 制造格式', detail: '3D Manufacturing Format，微软主导的 3D 打印标准格式，基于 Open XML 打包。相比 STL 支持颜色、材质和多部件信息，是 3D 打印的推荐格式。' },
  { type: 'model/gltf+json', exts: ['gltf'], desc: 'glTF 3D 模型 (JSON)', detail: 'GL Transmission Format 的 JSON 版本，Khronos 制定的 3D 模型开放标准。外部引用二进制数据（.bin）和纹理图片，文件可读性好，是 3D 场景分发的"JPEG"。' },
  { type: 'model/gltf-binary', exts: ['glb'], desc: 'glTF 3D 模型 (二进制)', detail: 'glTF 的二进制单文件版本，将 JSON 描述、二进制几何数据和纹理图片合并为一个文件。体积更小、加载更快，是 Web 3D 应用的首选格式。' },
  { type: 'model/obj', exts: ['obj'], desc: 'OBJ 3D 模型', detail: 'Wavefront OBJ 格式，以纯文本存储 3D 几何数据（顶点、法线、纹理坐标）。结构简单通用性广，但不支持动画和场景层级，常配合 MTL 材质文件使用。' },
  { type: 'model/stl', exts: ['stl'], desc: 'STL 3D 模型', detail: 'Stereolithography 格式，仅描述 3D 模型的表面三角面片，不含颜色和材质信息。是 3D 打印和 CAD 系统间数据交换最常用的格式，有文本和二进制两种编码。' },
  { type: 'model/vrml', exts: ['wrl'], desc: 'VRML 3D 场景', detail: 'Virtual Reality Modeling Language，早期描述交互式 3D 场景的文本格式。已被 X3D 取代，但在 CAD 和工业设计领域仍有遗留使用，wrl 扩展名源自 "world"。' },

  // multipart
  { type: 'multipart/form-data', exts: ['multipart'], desc: '表单文件上传', detail: 'HTML 表单上传文件时使用的编码类型，将表单字段和文件内容以分隔符划分为多个部分。每个部分可指定独立的 Content-Type，是浏览器文件上传的唯一标准方式。' },
  { type: 'multipart/byteranges', exts: ['byteranges'], desc: '字节范围响应', detail: '当服务器返回多个不连续的范围请求结果时使用此类型，每个部分包含独立的 Content-Range 头标明其对应的字节区间。由 Accept-Ranges 和 Range 请求头触发。' },

  // text
  { type: 'text/calendar', exts: ['ics'], desc: '日历文件', detail: 'iCalendar 格式，用于描述日历事件和待办事项。以纯文本存储，支持事件时间、地点、重复规则和与会者信息，是 Outlook、Google Calendar 等日历应用互导数据的标准格式。' },
  { type: 'text/css', exts: ['css'], desc: 'CSS 样式表', detail: 'Cascading Style Sheets，Web 页面的样式描述语言，控制布局、颜色、字体等视觉表现。支持媒体查询实现响应式设计，自定义属性（CSS Variables）实现主题化。' },
  { type: 'text/csv', exts: ['csv'], desc: 'CSV 数据', detail: 'Comma-Separated Values，以逗号分隔字段的纯文本表格格式。简单通用，Excel、数据库和数据分析工具均支持读写。RFC 4180 标准化了格式规范，但实际中方言较多。' },
  { type: 'text/html', exts: ['html', 'htm'], desc: 'HTML 文档', detail: '超文本标记语言，Web 页面的标准格式。htm 是 DOS 时代三个字符扩展名限制的遗留。' },
  { type: 'text/javascript', exts: ['js'], desc: 'JavaScript (传统)', detail: 'MIME 类型 text/javascript 是早期 HTML4 规范推荐的类型，现已被 application/javascript 取代。因历史原因仍广泛使用，IETF 已将其重新标准化为等效类型。' },
  { type: 'text/markdown', exts: ['md', 'markdown'], desc: 'Markdown 文档', detail: '轻量级标记语言，使用纯文本符号（如 # 标题、** 加粗）定义格式。md 是常用扩展名，markdown 为完整扩展名。GitHub Flavored Markdown 是最流行的方言。' },
  { type: 'text/plain', exts: ['txt', 'text', 'log'], desc: '纯文本', detail: '无任何格式标记的纯文本内容，是最基础最通用的文件类型。txt 为通用文本，text 为 Mac OS 9 遗留扩展名，log 用于日志文件（本质上也是纯文本）。' },
  { type: 'text/richtext', exts: ['rtx'], desc: '富文本', detail: 'MIME 定义的最小富文本格式，仅支持粗体、斜体和下划线等基本格式。功能远不如 RTF 丰富，实际中几乎不使用，不要与 application/rtf 混淆。' },
  { type: 'text/rtf', exts: ['rtf'], desc: 'RTF 文档', detail: '以 text 类型注册的 RTF 格式，与 application/rtf 内容相同但 MIME 注册类型不同。实际使用中 application/rtf 更常见，两者可互换。' },
  { type: 'text/sgml', exts: ['sgml', 'sgm'], desc: 'SGML 文档', detail: 'Standard Generalized Markup Language，HTML 和 XML 的前身元语言。定义标记语言的规则，本身极为复杂，已被更简洁的 XML 取代。sgm 是短扩展名。' },
  { type: 'text/tab-separated-values', exts: ['tsv'], desc: 'TSV 数据', detail: '以制表符（Tab）分隔字段的纯文本表格格式，与 CSV 类似但使用 Tab 作为分隔符。避免了 CSV 中逗号与内容冲突的问题，常见于数据库导出和生物信息学数据。' },
  { type: 'text/vtt', exts: ['vtt'], desc: 'WebVTT 字幕', detail: 'Web Video Text Tracks，W3C 定义的 Web 字幕格式，以纯文本存储时间轴和字幕内容。是 HTML5 <track> 元素唯一支持的字幕格式，支持样式、定位和章节标记。' },
  { type: 'text/xml', exts: ['xml'], desc: 'XML 文本', detail: '以 text 类型注册的 XML 格式，与 application/xml 内容相同。作为 text 类型时默认以 UTF-8 解析，而 application 类型需通过 BOM 或声明检测编码。' },
  { type: 'text/yaml', exts: ['yaml', 'yml'], desc: 'YAML 文档', detail: 'YAML Ain\'t Markup Language，以缩进表示层级的数据序列化格式，强调可读性。广泛用于配置文件（Docker Compose、CI/CD、Kubernetes），yml 是更常用的扩展名。' },

  // video
  { type: 'video/3gpp', exts: ['3gp'], desc: '3GPP 视频', detail: '3GPP 定义的移动设备视频格式，基于 MP4 容器，通常使用 H.263 视频编码和 AMR 音频编码。针对 3G 网络低带宽优化，是功能机时代的标准视频格式。' },
  { type: 'video/3gpp2', exts: ['3g2'], desc: '3GPP2 视频', detail: '3GPP2（CDMA2000 标准）定义的移动视频格式，与 3gp 类似但支持 CDMA 特有的音频编码（如 EVRC、QCELP）。主要用于北美和韩国的 CDMA 网络。' },
  { type: 'video/avi', exts: ['avi'], desc: 'AVI 视频', detail: 'Audio Video Interleave，微软 1992 年推出的多媒体容器格式。不支持流式播放和现代编码，文件体积大，已被 MP4/Matroska 取代，但旧视频资源中仍大量存在。' },
  { type: 'video/mp4', exts: ['mp4', 'm4v'], desc: 'MP4 视频', detail: '基于 ISO Base Media File Format 的视频容器，通常封装 H.264/H.265 视频和 AAC 音频。兼容性最佳的 Web 视频格式，所有平台和浏览器均支持。m4v 是 Apple 的变体，可能含 FairPlay DRM。' },
  { type: 'video/mpeg', exts: ['mpeg', 'mpg'], desc: 'MPEG 视频', detail: 'MPEG-1/MPEG-2 视频格式，DVD 和早期数字电视的标准编码。压缩率远低于 H.264，mpg 是 MPEG 的短扩展名。已被 H.264/H.265 取代，仅存于旧内容和广播电视领域。' },
  { type: 'video/ogg', exts: ['ogv'], desc: 'OGG 视频', detail: 'OGG 容器中的视频流，通常使用 Theora 视频编码和 Vorbis 音频编码。开源免专利，但编码效率和画质远不如 H.264，浏览器支持也已萎缩，已被 WebM 取代。' },
  { type: 'video/quicktime', exts: ['mov'], desc: 'QuickTime 视频', detail: 'Apple QuickTime 容器格式，与 MP4 同源于 ISO Base Media File Format，结构高度相似。mov 常用于视频编辑的中间格式，大部分 mov 文件可直接改扩展名为 mp4 播放。' },
  { type: 'video/webm', exts: ['webm'], desc: 'WebM 视频', detail: 'Google 为 Web 设计的开放视频格式，基于 Matroska 容器，使用 VP8/VP9/AV1 视频编码和 Opus/Vorbis 音频编码。免专利费，是 HTML5 视频的推荐格式之一。' },
  { type: 'video/x-flv', exts: ['flv'], desc: 'Flash 视频', detail: 'Flash Video 格式，曾是在线视频的主流格式（如早期 YouTube），支持 RTMP 流式传输。随着 Flash 的淘汰已被 MP4/HLS 取代，部分直播推流场景仍在使用。' },
  { type: 'video/x-matroska', exts: ['mkv'], desc: 'Matroska 视频', detail: 'Matroska 开放容器格式，可封装几乎所有视频和音频编码（H.264、HEVC、FLAC 等）。支持多音轨、多字幕和章节标记，是影视收藏和发布的首选格式，但部分播放器和设备原生不支持。' },
  { type: 'video/x-ms-wmv', exts: ['wmv'], desc: 'Windows Media 视频', detail: 'Windows Media Video，微软开发的视频编码格式，使用 ASF 容器。在 Windows 平台兼容性好，但跨平台支持差，已被 H.264 等开放标准取代。' },
]

const CATEGORY_NAMES = {
  application: 'Application',
  audio: 'Audio',
  font: 'Font',
  image: 'Image',
  message: 'Message',
  model: 'Model',
  multipart: 'Multipart',
  text: 'Text',
  video: 'Video',
}

/** Group MIME types by category prefix. */
export function getMimeGroups() {
  const map = new Map()
  for (const item of MIME_TYPES) {
    const category = item.type.split('/')[0]
    if (!map.has(category)) {
      map.set(category, { name: CATEGORY_NAMES[category] || category, items: [] })
    }
    map.get(category).items.push(item)
  }
  return Array.from(map.entries()).map(([key, val]) => ({ key, ...val }))
}

/** Search MIME types by type string, extension, or description. */
export function searchMimeTypes(query) {
  const q = query.trim().toLowerCase()
  if (!q) return MIME_TYPES
  return MIME_TYPES.filter(item =>
    item.type.toLowerCase().includes(q) ||
    item.exts.some(ext => ext.toLowerCase().includes(q)) ||
    item.desc.toLowerCase().includes(q) ||
    item.detail.toLowerCase().includes(q),
  )
}
