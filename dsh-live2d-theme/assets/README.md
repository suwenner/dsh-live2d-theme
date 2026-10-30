# assets 目录说明

这个目录让插件**自包含**：运行时、模型、默认背景都在包内，装好即可用。

```
assets/
├── runtime/
│   ├── pixi.min.js                 # PIXI v6.5.10 (MIT)
│   ├── pixi-live2d-display.min.js  # pixi-live2d-display 0.4.0 (MIT)
│   ├── live2d.min.js               # Live2D Cubism 2 core（Live2D Inc. 可再分发）
│   └── live2dcubismcore.min.js     # Live2D Cubism 4 core（Live2D Inc. 可再分发）
├── models/
│   ├── HK416/                      # Q版模型（Cubism 2）
│   └── Pio/                        # Q版模型（Cubism 2）
├── background/
│   └── bg.jpg                      # 默认背景图
└── config.json                     # 默认配置（首次运行会写到 dataDir）
```

## 许可提示（重要）

- `pixi.min.js`、`pixi-live2d-display.min.js`：MIT，可自由分发。
- `live2d.min.js` / `live2dcubismcore.min.js`：Live2D Inc. 的 Cubism SDK，属于 "Redistributable Code"，按 Live2D 的许可条款分发；商用前请阅读 https://www.live2d.com/eula/ 。
- `models/HK416`、`models/Pio`：第三方示例模型，仅适合**本地/个人**使用。
  **公开分发前**请替换成你有权再分发的模型（例如 Live2D 官方允许再分发的示例模型，或你自建/购买的模型），
  或者删掉这两个模型目录，让用户自行往 `models/` 里放。
