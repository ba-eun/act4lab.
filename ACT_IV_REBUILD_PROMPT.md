# ACT IV 当前网站重建提示词

生成日期：2026-05-22

用途：将下面提示词复制给设计/开发/AI 建站工具，可按当前 ACT IV｜第四幕 未来视觉研究室官网与后台管理形态重新搭建网站。

```text
请为“ACT IV｜第四幕 Future Visual Lab / 未来视觉研究室”重建一个前台展示与后台管理一体化的网站。网站不是营销落地页，而是一个深色、实验性、艺术研究室气质的作品集与内容管理系统。第一屏必须直接呈现真实网站体验，不要先做宣传介绍页。

一、整体视觉与品牌

整体风格为黑底高对比、冷调实验室、未来视觉研究室、新媒体艺术与跨媒介研究气质。页面背景使用深黑色为主，叠加细密网格、轻微噪点、冷蓝和暗紫径向光感。主文字为白色和浅灰，强调色为冷蓝 #9ecbff 与紫色 #8a55ff。不要使用浅色商业 SaaS 风格，不要做成暖色、卡通、插画或常规企业官网。

字体使用 Aptos、微软雅黑、苹方或系统 sans-serif。大标题全部大写、超粗、紧凑，桌面端二级页面标题如 WORKS、PEOPLE、PUBLICATIONS 可接近 8rem。正文较小，行高宽松，整体左对齐、网格分栏。不要使用负字距。页面区块之间用细线、网格、黑色大留白形成节奏。

全站顶部有一条极窄状态栏，中间显示蓝色 “ACT IV” 和白色 “CROSS-MEDIA & MULTIMODAL”。主导航左侧是 ACT IV logo，居中导航为 About LAB、People、Works、Board、Contact，右侧是两条线的菜单/站点地图按钮。当前导航项下方有细蓝线。Board 在桌面端 hover/focus 展开下拉，包含 News、Project、Publications；触屏端点击 Board 切换展开，点击外部或 Escape 关闭。

移动端隐藏桌面导航，只保留 logo 与汉堡菜单。点击后打开全屏或大面板移动菜单，每个一级栏目带 01、02 等编号，Board 可展开子项。所有布局需响应式适配，标题与卡片网格在移动端收窄为单列或少列。

页脚为黑色横向页脚，左侧显示 “COPYRIGHT © 2026 ACT IV FUTURE VISUAL LAB”，右侧显示 “CROSS-MEDIA & MULTIMODAL”，最右是向上箭头和 TOP。全站使用 GSAP ScrollTrigger 或等效滚动 reveal：桌面端区块元素初始轻微下移并透明，滚入视口后上浮显现；移动端和减少动效模式下内容保持可见。

二、前台页面结构

首页：
首页第一屏是全宽动态视觉 hero，主文案为 “BREAKING BOUNDARIES”，居中偏大，左侧有线性流动/路径感图形，背景叠加暗紫与冷蓝光感，上下有细线分隔。Hero 下方是研究室介绍区，桌面端两栏显示两段中文说明，移动端变单列。

首页随后显示四个内容区：News、Works、Project、Publications。每个区块标题左侧为栏目名，右侧有箭头图标，区块下方有“查看更多”入口。News 读取 board.news 最新/手动排序内容，最多 4 条文本行；Works 读取 Works 内容，最多 8 张媒体卡片；Project 读取 board.projects，最多 8 张媒体卡片，当前线上为空；Publications 读取 board.research，最多 4 条文本行。点击栏目箭头或查看更多进入列表页，点击卡片进入详情页。

About LAB：
页面标题为巨大 “ABOUT LAB”。标题下显示中文标签“关于我们”和标题“未来视觉设计研究室”。正文为三栏结构：左列编号 01/02，中列模块标题，右列多段正文，模块之间用横线分隔。下方有四幕 object band：ACT I 凝视/秩序、ACT II 流动/叙事、ACT III 对话/共生、ACT IV 破墙/融合。四个大格等宽，背景带竖向网格，hover 时变亮。底部居中显示研究室精神短句。

People：
页面标题为 “PEOPLE”，标题下有蓝色小标签 PEOPLE。人员按分类分组显示，当前线上主要有 Faculty 和 Members；Director、Former Members 如果为空则不显示。Faculty 当前 3 人，Members 当前 7 人。人员卡片左侧显示头像/照片，右侧显示姓名和研究方向/兴趣，卡片有细边框、深色透明背景。桌面端 Faculty 一行 3 张，Members 多列网格；移动端改为单列或窄卡片。

People 公共列表中点击人员卡片打开弹窗详情，而不是直接跳详情页。弹窗有顶部标题、头像/附件区和字段列表，支持关闭、最小化、最大化，Escape 或点击遮罩可关闭。公共详情路由 /people/:id 也存在，但列表交互优先使用弹窗。后台编辑状态下点击编辑进入 /admin/people/:id 的 People 表单编辑页。

Works：
页面标题为 “WORKS”。当前线上 Works 为 11 个作品卡片的视觉网格，桌面端 4 列，卡片接近方形偏高，边框极细，图片全幅铺满。卡片默认主要显示视觉图，不显示文字；hover/focus 时底部浮出标题、年份和简介覆盖层，边框变蓝并轻微上移。点击作品进入 /works/:id 详情页。

Works 详情页顶部是大标题，主体为内容画布或媒体布局。若条目使用 stack contentLayout，则按保存的自由排版展示图片、视频、文本框和字段，并在底部列出固定字段，如 PEOPLE、INTRODUCTION、DATE。视频预览要优先显示 poster/thumbnail/cover 或占位图，不要显示黑色视频块；点击视频预览打开媒体 lightbox 播放。

Board：
Board 首页为三张大卡片：News、Project、Publications。每张卡片左上显示编号 01/02/03，中部显示栏目名，底部显示条目数量。当前线上为 News 1 ITEMS、Project 0 ITEMS、Publications 7 ITEMS。News 列表为文本卡片列表，当前 1 条；Project 列表当前为空，但保留后台新增入口；Publications 列表读取 board.research，当前 7 条，以网格卡片显示年份和英文标题。

Board 详情页路由为 /board/:section/:id，使用统一详情文章组件。Publications 倾向简单附件链接和字段展示；News 支持长文本与 stack 画布，当前 News 条目是一篇较长的执行方案文本。

Contact：
页面标题为 “CONTACT”。公共联系页按字段分行展示，左侧为蓝色大写标签，右侧为较大内容。当前线上主要显示 EMAIL：act4lab@163.com / act4lab@gmail.com；ADDRESS 为空；其他方向/兴趣字段在当前线上 schema 中为空或不显示。

三、媒体、附件与详情交互

附件模型支持图片、视频、音频、PDF、文档、表格、压缩包等。图片/视频用于卡片和详情视觉；非视觉附件在详情中以文件行显示，包含文件类型图标、文件名和元信息。图片默认 object-fit: cover，支持 crop 数据。详情中的图片可进入 lightbox。

视频详情预览必须 poster/thumbnail/cover 优先，并有居中播放按钮。点击进入黑色遮罩 lightbox 播放。视频 lightbox 的进度条是单层自定义 seek layer，默认隐藏，在 hover、拖动或触摸后显示。拖动进度条会更新 currentTime，并兼容视频 duration 尚未加载时的 pending seek，恢复播放时保持用户拖到的位置。

自由内容布局使用 contentLayout.mode = "stack"。每个 item 类型可为 text、attachment、field，具有 x/y/w/h/z/row 等数据。公共端按比例定位渲染；后台端可拖拽、调整大小、上传附件、添加文本框、重置布局。文本框支持多行、粘贴换行、字体大小；后台编辑器需自动测量文字高度，手动缩放后的文本框应持久化 manualSize，避免再次被自动高度覆盖。

四、后台管理模型

后台入口为 /admin/，也支持独立后台域名 /admin/。登录前显示独立登录页：黑色背景、ACT IV ADMIN 标识、用户名、密码、登录按钮和错误提示。登录成功后不进入传统 CMS 仪表盘，而是在 /admin/... 路由下复用前台页面框架，并显示后台编辑能力。

登录后全局变化：前台页头仍保留；页头下方出现后台面包屑，如“后台 / 作品 / SIGHT”；右上角浮出“编辑模式/预览模式”切换按钮和“退出”按钮。进入编辑模式后，页面内容项显示行内控制条：编辑、增加、上移、下移、删除。从编辑模式切到预览模式前要触发当前页面注册的保存处理器；如果保存失败，停留在编辑模式并提示。

保存模型：后台通过 PUT /api/content 保存完整安全化后的内容对象，请求必须带登录 session。保存请求附带 pagePath、module、action 等 scope 信息。保存成功后前台内容立即更新，并广播给当前窗口/其他窗口。线上环境使用 Cloudflare Pages Functions 的内容存储与上传存储；本地开发使用 server.js、data/content.json 和 uploads/。重建当前线上网站时，以线上 /api/content 为当前内容源，不要以本地示例 data/content.json 为准。

后台首页：
仍显示首页视觉结构。首页介绍区在编辑态可直接编辑段落，支持增加段落、清空、保存上线。News、Works、Project、Publications 首页区块中的内容项可编辑、增加、删除和排序；点击编辑进入对应详情后台页。

About 后台：
支持编辑 About 标签和标题；增加、编辑、删除内容模块；每个内容模块可编辑编号、标题和多段正文；可编辑底部理念语。编辑方式接近前台外观的 inline editable，而不是传统表格。

People 后台：
People 列表后台支持按分类新增、编辑、删除、排序人员。人员可跨分类拖拽，空分类显示“拖拽人员到这里，或点击新增”。People 详情后台必须是独立表单编辑器，不使用自由画布编辑器，不改变公共 People 展示方式。

People 表单包括头像/附件区、可裁剪/替换/删除头像；字段包括名字、分类、邮箱、职位、研究方向、简介、经历等；字段管理区可添加字段、删除非保护字段、双击修改中英文标签；字段排序只能拖左侧专门把手，不能整行拖拽；底部提供删除与保存上线。

Works / News / Project / Publications 详情后台：
使用统一 split detail editor，分为固定信息区和自由画布区。固定信息区显示当前条目标题、封面图、标题/简介/人员/时间等固定字段；非保护字段可删除；中英文字段标签可双击修改；字段排序只能拖左侧把手；可添加字段。自由画布区支持添加文本框、上传附件、拖动、调整大小、调整层级、重置布局。附件工具条保持可见，方便删除/调整/拖拽。保存时仅保留被画布引用的附件，未引用附件会被裁剪。

Contact 后台：
通过站点信息编辑器处理基础信息、logo、联系人字段、字段 schema 和附件/画布。但公共 Contact 当前只按字段列表展示内容，不渲染 Contact 自由画布附件。若要完全保持当前逻辑，只需复建字段列表；若希望 Contact 也自由排版，需要额外实现公共端画布渲染。

五、数据与当前线上内容

当前线上内容更新时间为 2026-05-22T13:19:03.597Z。当前线上数量：Works 11 条、People 10 条、Board News 1 条、Board Project 0 条、Board Publications 7 条，Publications 实际存储键为 board.research，Project 实际存储键为 board.projects。

站点基础信息：顶部文案为 “ACT IV CROSS-MEDIA & MULTIMODAL”；线上 site.logo 为空，但前端回退显示 /logo2.png；联系邮箱为 act4lab@163.com / act4lab@gmail.com；页脚口号为 CROSS-MEDIA & MULTIMODAL。

请实现这些页面、视觉、后台编辑、保存同步、响应式、媒体预览、视频 lightbox、自由画布、字段 schema、排序与拖拽把手等细节。重点是复刻当前 ACT IV 网站的真实体验与内容管理方式，而不是只做静态展示页。
```
