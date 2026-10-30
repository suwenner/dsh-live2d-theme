# dsh-live2d-theme

给 DeepSeek Harness 的 Web GUI 加背景自定义 + 右下角 Q版 Live2D 看板娘。

- **背景**：主色 / 文字色 / 渐变 / 背景图，半透明毛玻璃面板，侧边栏和对话区一起透出。
- **看板娘**：Q版 Live2D（内置 HK416、Pio），支持眼神跟随、点击随机动作、拖动、缩放、隐藏、切换模型。
- **自包含**：运行时、模型、默认背景都在包内 `assets/`，装好即可用，不依赖外网 CDN。
- **可视化设置面板**：⚙ 打开，实时改配色 / 背景 / 尺寸 / 模型，保存写回配置。

## 目录结构（包内自包含）

```
dsh-live2d-theme/
├── lib/index.mjs          # 宿主半侧：静态资源 + 模型列表 + 配置/上传接口
├── client.js              # 浏览器半侧：主题 CSS + Live2D + 设置面板
├── cordis.patch.yml       # bundle 层自注册（抗 profile 重写）
├── assets/
│   ├── runtime/           # PIXI + Live2D core（见 assets/README.md 的许可说明）
│   ├── models/            # HK416、Pio
│   ├── background/bg.jpg  # 默认背景
│   └── config.json        # 默认配置
├── README.md
└── LICENSE
```


## 安装

**方式一：插件管理器（推荐，装好即用）**

```bash
dsh plugin --profile desktop add github:suwenner/dsh-live2d-theme
```

或在 DSH 的「插件」页面里通过插件市场 / 从仓库安装。

**方式二：手动放进 profile**

1. 把本目录拷到 `$DSH_HOME/plugins/dsh-live2d-theme/`；
2. `$DSH_HOME/profiles/desktop/package.json` 的 `dependencies` 加
   `"dsh-live2d-theme": "file:../../plugins/dsh-live2d-theme"`，
   并在 `dsh.profile.bundles` 里加 `"dsh-live2d-theme"`；
3. 跑一次 `pnpm install`（在 profile 目录），然后重启 DSH。

> 插件自己的 `cordis.patch.yml` 会在 bundle 层自注册主条目，所以 profile 的
> `cordis.patch.yml` 被应用重写也不会丢掉注册。


## 可视化设置面板（推荐）

看板娘右上角有三个小按钮：

- **⚙** 打开设置面板：实时修改主色、背景透明度、背景图、看板娘宽高、显示/隐藏，改完即时生效；
- **✥** 按住拖动，把看板娘拖到屏幕任意位置；
- **🙈** 隐藏/显示看板娘。

面板里的 **保存** 会把当前设置写回 `D:\工具\live2\config.json`（走宿主 `POST /dsh-live2d-theme/config`，重启后也不丢）；**恢复默认** 复位成本内置默认值。面板里也可以直接选一张本地图片上传，会自动存成 `background\bg.<ext>` 并设为背景。

## 手动改配置

所有外观也在 **`config.json`** 里，改完保存 → 刷新页面即生效（不用重启应用）：

```json
{
  "accent": "#7c5cff",
  "backgroundImage": "/dsh-live2d-theme/background/bg.jpg",
  "backgroundOpacity": 0.55,
  "gradientDark": "radial-gradient(...)",
  "gradientLight": "radial-gradient(...)",
  "modelUrl": "/dsh-live2d-theme/models/HK416/model.json",
  "modelWidth": 260,
  "modelHeight": 300,
  "marginRight": 18,
  "marginBottom": 10,
  "visible": true
}
```

| 字段 | 含义 |
|---|---|
| `accent` | 主强调色（链接/高亮/焦点环） |
| `backgroundImage` | 背景图 URL；默认 `/dsh-live2d-theme/background/bg.jpg`，文件不存在自动回退渐变 |
| `backgroundOpacity` | 面板不透明度 0-1，越高面板越实、背景越淡 |
| `gradientDark` / `gradientLight` | 无背景图时的深/浅渐变 |
| `modelUrl` | 看板娘模型路径 |
| `modelWidth` / `modelHeight` | 看板娘画布尺寸（px），模型按比例自适应不裁头 |
| `marginRight` / `marginBottom` | 看板娘离右下角距离 |
| `visible` | 是否默认显示 |

**换背景图**：把任意图片放到 `live2\background\bg.jpg`，刷新即用（也可改 `backgroundImage` 指到别的文件名/路径）。

## 换模型

**最简单**：面板里「看板娘模型」下拉框直接选，选完即时切换（会自动重新加载 PIXI 场景）。下拉列表来自 `GET /dsh-live2d-theme/models`，扫描 `live2\models\` 下的目录：

- 目录里有 `*.model3.json` → 识别为 Cubism 4 模型；
- 目录里有 `model.json` → 识别为 Cubism 2 模型。

当前已内置两个模型：`HK416`（Q版，Cubism 2）、`Pio`（Q版，Cubism 2）。

**手动加模型**：把模型目录整体丢进 `live2\models\<名字>\`，点面板里下拉框右边的 **⟳** 重新扫描即可。模型可从 https://github.com/hacxy/l2d-models 下载。

> Cubism 4 模型需要 `live2dcubismcore.min.js`——插件启动时已自动加载过，所以 Cubism 2 / 4 都能直接用。

## 卸载 / 回滚

删掉 profile 里上面第 1、2 步加的内容，重启即可完全还原；或直接删 `$DSH_HOME/plugins/dsh-live2d-theme` 目录。

