# ACT IV 当前网站与后台管理文字描述

生成日期：2026-05-22
核对范围：线上站点 `https://act4lab.com/`、线上公开内容接口 `/api/content`、后台入口 `https://act4lab.com/admin/` 与 `https://admin.act4lab.com/admin/`、本地当前代码实现。
用途：用于确认当前实现是否符合既有要求，并作为未来重新搭建网站/后台时的复建参考。

## 0. 关键结论

当前线上站点是一个深色、实验室气质、作品集/CMS 一体化网站。前台负责展示研究室介绍、人员、作品、公告/项目/出版物与联系方式；后台不是传统表格后台，而是在 `/admin/...` 路由下复用同一套前台页面，登录后浮出编辑模式、面包屑、行内编辑按钮、详情页表单/画布编辑器和保存上线按钮。

线上内容与本地 `data/content.json` 不一致：线上内容更新于 `2026-05-22T13:19:03.597Z`，当前线上有 Works 11 条、People 10 条、News 1 条、Project 0 条、Publications 7 条；本地内容仍是旧示例数据，只有 Works 4 条、People 4 条、News 3 条、Project 4 条、Publications 1 条。若重建“当前网站”，应以线上 `/api/content` 为当前内容源，而不是本地 `data/content.json`。

与既有要求的匹配度：整体符合“前台视觉不随意变动、后台可编辑、详情页可自由排版、People 后台独立表单、固定字段拖拽必须只用把手、保存后前台同步”的方向。需要注意的差异/空缺是：线上 Project 当前为空，因此 Board 的 Project 卡片显示 `0 ITEMS`，首页 Project 区域也会无实际卡片；线上 Contact 当前只显示邮箱；线上 `site.logo` 是空数组，但前台会回退使用 `/logo2.png`。

## 1. 全局视觉与结构

整体风格：黑底、白字、高对比、偏实验室/新媒体艺术方向。页面背景是深黑色叠加细网格、轻微噪点、暗紫/冷蓝径向光感，所有页面统一使用相同的底纹系统。主色为白色和浅灰，强调色是冷蓝 `#9ecbff` 与紫色 `#8a55ff`。

字体与排版：主字体栈为 Aptos、微软雅黑、苹方和系统 sans-serif。大标题全部大写、极粗、紧凑，桌面端二级页面标题如 `WORKS`、`PEOPLE`、`PUBLICATIONS` 可达到 8rem 左右；正文偏小，行高宽松。字距没有负值，整体以左对齐和网格分栏为主。

页头：顶部有一条极窄黑色状态栏，中间显示蓝色 `ACT IV` 和白色 `CROSS-MEDIA & MULTIMODAL`。主导航区左侧为 ACT IV logo，居中为导航项 `About LAB / People / Works / Board / Contact`，右侧是两条线的站点地图/菜单按钮。当前页面导航项下方有细蓝线。

Board 下拉：桌面端 hover/focus Board 时展开下拉菜单，包含 `News / Project / Publications`。触屏设备上点击 Board 会切换下拉展开状态。点击外部或按 Escape 会关闭。

移动端：主导航隐藏，仅保留 logo 和汉堡菜单按钮。点击菜单后打开全屏/大面板式移动菜单，每个一级栏目带编号 `01`、`02` 等；Board 在移动菜单中可展开子项。移动端标题和卡片栅格收窄，后台编辑区改为单列。

页脚：所有页面底部为黑色横向页脚，左侧是 `COPYRIGHT © 2026 ACT IV FUTURE VISUAL LAB`，右侧是 `CROSS-MEDIA & MULTIMODAL`，最右有向上箭头和 `TOP`。当前代码中页脚文案是常量，不完全依赖内容里的 `site.footerTagline`。

动效：使用 GSAP ScrollTrigger 实现滚动 reveal。桌面端区块内元素初始透明并下移，滚入视口后上浮显现；移动端和减少动效模式下内容保持可见。主页 hero 的文字有入场动画，文字 hover 有轻微上移。

## 2. 线上当前内容概况

站点基础信息：
- 顶部文案：`ACT IV CROSS-MEDIA & MULTIMODAL`
- Logo：线上内容字段为空，但前端回退显示 `/logo2.png`
- 联系邮箱：`act4lab@163.com / act4lab@gmail.com`
- 联系地址：当前为空
- 联系方向：当前为空
- 页脚存储值：`CROSS-MEDIA & MULTIMODAL`

首页介绍：
- 第一段说明 ACT IV 将“打破第四堵墙”转化为未来视觉研究方法，强调艺术与科技融合、传统视觉语言与前沿媒介对话。
- 第二段说明研究室围绕四幕递进：静态秩序、动态叙事、交互对话与未来视觉融合，并构成跨媒介、多模态视觉系统。

About 内容：
- 标签：`关于我们`
- 标题：`未来视觉设计研究室`
- 模块 01：`研究室定位`
- 模块 02：`核心理念`
- 底部理念：`艺术与科技融合，传统与前沿对话，设计与真实场景贯通`

当前线上内容数量：
- Works：11
- People：10
- Board / News：1
- Board / Project：0
- Board / Publications：7

## 3. 前台页面

### 3.1 Home

首页第一屏是全宽动态视觉 hero。主体文字为 `BREAKING BOUNDARIES`，居中偏大，左侧有线性流动/路径感图形，背景叠加暗紫与冷蓝光感。该区域上下都有细边线，与页头形成强烈的横向分隔。

Hero 下方是研究室介绍区，桌面端两栏排布两段中文说明，移动端变为单列。随后是四个首页内容区：`News`、`Works`、`Project`、`Publications`。每个区块标题左侧显示栏目名，右侧有箭头图标，区块下方有“查看更多”按钮。

首页内容来源：
- News 取 Board/news 的最新/手动排序内容，最多 4 条，文本行形式。
- Works 取 Works 内容，最多 8 条，媒体卡片形式。
- Project 取 Board/projects 内容，最多 8 条；线上当前为空。
- Publications 取 Board/research 内容，最多 4 条，文本行形式。

交互：点击栏目箭头或“查看更多”进入对应列表页；点击具体卡片进入详情页。后台编辑态下每个内容项上方会浮出编辑、增加、上移/下移、删除控件。

### 3.2 About LAB

页面标题为超大 `ABOUT LAB`。标题下显示两行 slogan：第一行 `关于我们`，第二行 `未来视觉设计研究室`，第二行颜色更浅。

正文采用三栏结构：左列是编号 `01/02`，中列是模块标题，右列是段落正文。模块之间用横线分隔。下方有四幕 object band：`ACT I 凝视/秩序`、`ACT II 流动/叙事`、`ACT III 对话/共生`、`ACT IV 破壁/融合`。四个大格等宽，背景带竖向网格，hover 时变亮。

页面底部居中显示研究室精神短句。

### 3.3 People

页面标题为 `PEOPLE`，标题下有蓝色小标签 `PEOPLE`。人员按类别分组显示，当前线上可见 `Faculty` 和 `Members`；`Director`、`Former Members` 因当前无内容而不显示。

Faculty 当前 3 人：Neun、Siooiii、Lindseyk。Members 当前 7 人：古头瓜生、Binbin、日薄山微云、嘎嘎、杏仁、荷包蛋、困困鱼。每个卡片左侧显示头像/照片，右侧显示姓名和研究方向/兴趣，卡片有细边框和深色透明背景。

桌面端人员卡片为多列栅格，Faculty 当前一行 3 张，Members 当前两行。移动端变为单列或更窄的卡片排列。

交互：前台 People 列表中，点击人员卡片打开弹窗详情，而不是直接跳详情页。弹窗有顶部标题、头像/附件区和字段列表。弹窗支持关闭、最小化、最大化；按 Escape 或点击遮罩可关闭。后台编辑态下点击编辑按钮会跳到 `/admin/people/:id` 的 People 表单编辑页。

People 详情页也存在 `/people/:id`，公共详情使用同一套详情文章组件展示头像、附件和字段；但列表点击优先使用弹窗。

### 3.4 Works

页面标题为 `WORKS`。当前线上 Works 是 11 个作品卡片的视觉网格，桌面端 4 列，卡片近似正方形偏高，边框极细，图片全幅铺满。卡片默认主要显示视觉图，不显示文字信息；hover/focus 时底部浮出标题、年份和简介的覆盖层，同时卡片边框变蓝、整体轻微上移。

当前线上作品包括：我、Jennie、TapTap 海外版 App UI 视觉设计、光栖·四序、April Seventeen：骨之花、self、沉积 · 分解 · 结晶、变迁、Sound of Beijing、City Server、SIGHT。

点击作品卡片进入 `/works/:id` 详情页。详情页顶部是大标题，主体为内容画布或媒体布局；若条目使用 stack contentLayout，会按保存的自由排版展示图片、视频、文本框，并在底部列出固定字段，如 `PEOPLE`、`INTRODUCTION`、`DATE`。当前线上至少有一个作品包含 mp4 视频附件，视频详情预览按代码逻辑使用 poster/封面优先，并保留点击打开媒体弹窗。

### 3.5 Board

Board 首页为三个大卡片：`News`、`Project`、`Publications`。每张卡片左上显示编号 `01/02/03`，中部显示栏目名，底部显示条目数量。当前线上显示：News 1 ITEMS，Project 0 ITEMS，Publications 7 ITEMS。

Board 下属页面：
- `/board/news/`：文本卡片列表，当前一条 `ACT IV｜第四幕 未来视觉研究室 执行方案`，年份 2026。
- `/board/project/`：项目列表页，当前为空；后台仍保留新增入口。
- `/board/publications/`：出版物列表页，当前 7 条，按卡片网格显示年份和英文标题。

News/Publications 的普通列表使用四列卡片/行式布局，卡片有边框和 hover 高亮。Project 被设计为类似 Works 的媒体卡片布局，但线上当前没有内容。

详情页：`/board/:section/:id` 使用统一详情文章组件。Publications 详情倾向于简单附件链接/字段展示；News 详情支持长文本 stack 画布，当前 News 条目是一篇非常长的执行方案文本，使用自由文本块保存。

### 3.6 Contact

页面标题为 `CONTACT`。公共联系页按字段分行展示，每行左侧为蓝色大写标签，右侧为较大的内容。

线上当前只实际显示 `EMAIL`：`act4lab@163.com / act4lab@gmail.com`。`ADDRESS` 为空，`INTERESTS/DIRECTIONS` 在线上 schema 中已不显示或为空，因此页面比本地示例更简洁。

## 4. 媒体、附件与详情展示

附件模型支持图片、视频、音频、PDF、文档、表格、压缩包等。图片/视频用于卡片和详情视觉；非视觉附件在详情中以文件行显示，带文件类型图标、文件名和元信息。

图片预览：图片默认 cover/object-fit，支持裁剪数据 `crop`。详情中的图像可以进入 lightbox 弹窗。

视频预览：详情页和自由画布中的视频不是直接显示黑色视频块，而是优先显示 poster/thumbnail/cover 或占位图，并有居中的播放按钮。点击视频预览打开 lightbox 播放。

视频 lightbox：弹窗为黑色遮罩，视频居中。进度条是单层自定义 seek layer，默认隐藏，在 hover、拖动或触摸后显示。拖动进度条会更新播放进度，并兼容视频 duration 尚未加载时的 pending seek。

详情媒体画布：如果有 `mediaLayout`，按保存的 x/y/w/h/z 在统一画布中排布；如果没有，按媒体画廊/轮播展示。多个媒体有左右切换按钮和底部点位。

自由内容画布：`contentLayout.mode = "stack"` 时，详情内容由若干 item 组成，类型包括 `text`、`attachment`、`field`。每个 item 有 x/y/w/h/z 和 row。公共端按这些比例定位；后台端可拖拽、调整大小、增加文本框、上传附件、重置布局。

## 5. 后台管理整体模型

后台入口：
- `https://act4lab.com/admin/`
- `https://admin.act4lab.com/admin/`

登录前显示独立登录页：黑色背景、`ACT IV ADMIN` 标识、用户名、密码、登录按钮和错误提示。登录成功后不会进入传统 CMS 仪表盘，而是进入 `/admin/...` 路由下的前台页面框架。

登录后全局变化：
- 页头仍是前台页头。
- 页头下出现后台面包屑，例如 `后台 / 作品 / SIGHT`。
- 右上角浮出 `编辑模式/预览模式` 切换按钮和 `退出` 按钮。
- 进入编辑模式后，页面内容项显示行内控制条：编辑、增加、上移、下移、删除。
- 从编辑模式切到预览模式前，会触发当前页面注册的保存处理器；如果保存失败，会停留在编辑模式并提示。

保存模型：后台通过 `PUT /api/content` 保存完整安全化后的内容对象，请求必须带登录 session。保存请求会附带 `pagePath`、`module`、`action` 等 scope 信息。保存成功后前台内容立即更新，并广播给当前窗口/其他窗口。

内容源：线上 Cloudflare Pages Functions 使用 KV/R2 一类环境变量存储内容和附件；本地 `server.js` 使用 `data/content.json` 与本地 `uploads/`。两个环境的当前数据不同。

## 6. 后台各模块编辑方式

### 6.1 首页

后台首页仍显示首页视觉结构。首页介绍区在编辑态显示可直接编辑的段落文本，支持增加段落、清空、保存上线。News、Works、Project、Publications 首页区块上的内容项可编辑、增加、删除、排序。点击编辑会进入对应详情后台页。

注意：由于首页内容区使用滚动 reveal，全页截图在未实际滚动时可能看起来空白；真实浏览时滚动触发后内容会显现。

### 6.2 About

About 后台支持：
- 编辑 About 标签和标题。
- 增加/编辑/删除内容模块。
- 每个内容模块可编辑编号、标题和多段正文。
- 编辑底部理念语。

编辑采用接近前台外观的 inline editable，而不是传统表格表单。

### 6.3 People

People 列表后台支持按分类新增人员、编辑人员、删除人员、排序人员。人员拖拽可跨分类，空分类会显示“拖拽人员到这里，或点击新增”。

People 详情后台是独立表单编辑器，不使用自由画布编辑器。这一点符合“People 后台保持表单化，且不改变前台展示”的要求。

People 表单包含：
- 头像/附件区：可更换头像、裁剪头像、删除头像。
- 字段：名字、分类、邮箱、职位、研究方向、简介、经历等。
- 字段管理区：可添加字段、删除非保护字段、双击修改中英文字段名。
- 字段排序：每个字段左侧有专门的拖拽把手，只有把手可拖动，不是整行可拖。
- 保存区：删除、保存上线。

线上 People schema 当前不含 `academicAbility`，本地旧 schema 含该字段。重建时应以线上 schema 为准。

### 6.4 Works / Board 详情

Works、News、Project、Publications 的详情后台使用统一的 split detail editor，分为固定信息区和自由画布区。

固定信息区：
- 顶部显示“固定信息”和当前条目标题。
- 封面图用于主页卡片和列表页；详情页画布不会因为封面而重复插入。
- 固定字段可编辑，例如标题、简介、人员、时间。
- 非保护字段可删除。
- 字段中英文标签可双击修改。
- 字段排序只能拖左侧专门把手。
- 可添加字段。

自由画布区：
- 支持添加文本框。
- 支持上传附件。
- 支持图片、视频、文件附件。
- 支持拖动、调整大小、排序层级。
- 支持重置布局。
- 文本框支持多行、粘贴换行、字体大小输入。
- 附件工具条常显，方便删除/调整/拖拽。

保存时，只有被画布引用的附件会保留到对应详情内容中；未引用附件会被剪裁。保存后会更新线上内容并清理未引用上传资源。

### 6.5 Contact

Contact 后台通过站点信息编辑器处理基础信息、logo、联系人字段、字段 schema 和附件/画布。但公共 Contact 页面当前只按字段行展示内容，不渲染 Contact 的自由画布附件。重建时如果希望 Contact 也自由排版，需要额外实现公共端渲染；如果保持当前逻辑，则只复建字段列表即可。

## 7. 字段与内容模型

主要顶层内容：
- `site`
- `homeIntro`
- `about`
- `board.news`
- `board.projects`
- `board.research`
- `works`
- `people`
- `archive`
- `manualSort`
- `fieldSchemas`

线上当前字段 schema：
- Contact：`address`、`email`
- People：`name`、`category`、`email`、`title`、`interests`、`history`、`experience`
- Works：`title`、自定义 `introduction`、自定义 `people`、自定义 `date`
- News：`title`、`date`、`people`、`intro`、`body`
- Project：`title`、`date`、`people`、`intro`、`body`
- Publications：`title`、`date`、`people`、自定义 `introduction`、`body`

排序：线上 `manualSort` 当前包含 `board.research`、`people`、`board.projects`、`works`，说明这些模块曾被后台手动排序。前台读取时应尊重 `manualSort`，不能简单按创建时间覆盖。

## 8. 交互清单

导航交互：
- 一级导航点击跳转。
- Board 桌面 hover/focus 展开下拉。
- 触屏点击 Board 切换下拉。
- 移动端菜单按钮打开移动面板。
- Escape 和外部点击关闭菜单/下拉。

列表交互：
- Works 卡片 hover 上移并显示覆盖文字。
- People 卡片点击打开人员弹窗。
- Board 卡片点击进入列表。
- 列表卡片点击进入详情。
- 页脚 TOP 返回页面顶部/首页。

弹窗交互：
- People 弹窗支持关闭、最小化、最大化。
- 图片/视频附件可打开 lightbox。
- 视频 lightbox hover/touch 才显示 seek bar。

后台交互：
- 登录/退出。
- 编辑模式/预览模式切换。
- 保存前自动保存。
- 行内编辑按钮浮出。
- 新增、删除、上移、下移。
- 字段把手拖拽排序。
- 作品/栏目/人员列表排序。
- 上传附件，视频大文件支持分片上传。
- 裁剪封面/头像。
- 自由画布拖拽、缩放、添加文本、上传附件、重置布局。

## 9. 响应式规则

桌面端：
- Header 为三列：logo / 居中导航 / 菜单按钮。
- Works 4 列视觉网格。
- Board hub 3 列。
- People 多列分组卡片。
- About 三栏内容。
- Contact 字段左标签右内容。

中小屏：
- 主导航折叠为移动菜单。
- Works、People、Board 栅格减少列数，最终趋向单列。
- About 三栏改为更紧凑布局。
- 后台详情编辑器从双列/宽布局压缩为单列。
- 保存条、上传条和编辑控件保持可触达，但移动端后台控件会更拥挤，当前截图中固定编辑工具可能覆盖部分内容。

## 10. 技术与部署要点

前端：React 19、Vite、GSAP、Framer Motion、Three.js、lucide-react。
样式：`src/styles.css` 为主，Tailwind 仅作为工具链引入。
本地后端：Express `server.js`。
线上后端：Cloudflare Pages Functions，主要接口在 `functions/api/*`。
内容接口：`GET /api/content`、`PUT /api/content`。
认证接口：`POST /api/login`、`GET /api/session`、`POST /api/logout`。
上传接口：`POST /api/upload`、`POST /api/upload-chunk`。
上传限制：支持常见图片、视频、音频、PDF、Office 文档、压缩包；默认最大 2GB；视频分片大小约 18MB。

SPA 路由：
- `/`
- `/about-lab/`
- `/people/`
- `/people/:id`
- `/works/`
- `/works/:id`
- `/board/`
- `/board/news/`
- `/board/news/:id`
- `/board/project/`
- `/board/project/:id`
- `/board/publications/`
- `/board/publications/:id`
- `/contact/`
- `/admin/` 与 `/admin/...`

线上状态核对：
- `https://act4lab.com/` 返回 200。
- `https://act4lab.com/admin/` 返回 200。
- `https://admin.act4lab.com/admin/` 返回 200。
- 公开内容接口返回线上最新内容，更新时间为 `2026-05-22T13:19:03.597Z`。

## 11. 复建时的最低规格

若重新搭建，应至少保留以下能力：
- 保留黑底网格噪点视觉、ACT IV 顶部条、居中导航、移动菜单和统一页脚。
- 保留 Home / About / People / Works / Board / Contact 六大前台板块。
- 保留 Board 三个子栏目：News、Project、Publications，即使 Project 当前为空。
- Works 必须是 4 列视觉作品网格，hover 显示文字。
- People 必须按 Faculty/Members 等分类展示，点击卡片打开详情弹窗。
- Works/Board 详情必须支持自由排版 contentLayout，包括文本、图片、视频和字段。
- 后台必须通过 `/admin/...` 复用前台页面进入编辑态，而不是只做一个孤立管理表格。
- People 后台必须是表单编辑器，不要改成自由画布。
- 固定字段和 People 字段排序必须只允许拖专门把手。
- 保存必须写入统一内容接口，并让前台立即更新。
- 需要保留上传、封面/头像裁剪、视频 poster/lightbox、单层隐藏式 seek bar。
- 前台读取列表顺序时必须尊重 `manualSort`。
