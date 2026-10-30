// dsh-live2d-theme 浏览器半侧：
// 1) 注入背景色/背景图自定义 CSS；
// 2) 加载 Live2D 运行时并在右下角渲染 Q版看板娘（默认 HK416）；
// 3) 提供悬浮设置面板：实时修改主色/背景/透明度/尺寸/位置，并可拖动看板娘。
window.__ModuleLoader__.load({
  id: "dsh-live2d-theme",
  factory: (require) => {
    var module = { exports: {} };
    var exports = module.exports;
    Object.defineProperty(exports, Symbol.toStringTag, { value: "Module" });

    const name = "dsh-live2d-theme";
    const inject = [];

    // ================= 默认配置 =================
    const CONFIG = {
      accent: "#ff6b9d",
      backgroundImage: "/dsh-live2d-theme/background/bg.jpg",
      backgroundOpacity: 0.42,
      // 文本颜色（空字符串 = 跟随主题，不覆盖）
      textColor: "#ececf6",
      textSecondaryColor: "#a9a9c4",
      gradientDark: "radial-gradient(1200px 800px at 20% -10%, #2a1522 0%, #140d12 55%, #0a0508 100%)",
      gradientLight: "radial-gradient(1200px 800px at 20% -10%, #fff0f6 0%, #fdf5f8 55%, #f7ecf3 100%)",
      modelUrl: "/dsh-live2d-theme/models/HK416/model.json",
      modelWidth: 260,
      modelHeight: 300,
      marginRight: 18,
      marginBottom: 10,
      visible: true,
    };
    const DEFAULT_CONFIG = JSON.parse(JSON.stringify(CONFIG));
    // ==============================================

    const RUNTIME_BASE = "/dsh-live2d-theme/runtime";
    const RUNTIME_SCRIPTS = [
      RUNTIME_BASE + "/live2d.min.js",
      RUNTIME_BASE + "/live2dcubismcore.min.js",
      RUNTIME_BASE + "/pixi.min.js",
      RUNTIME_BASE + "/pixi-live2d-display.min.js",
    ];

    let started = false;
    let l2dApp = null;
    let l2dModel = null;
    let l2dNaturalW = 2;
    let l2dNaturalH = 2;
    let bgResolved = "";

    const loadedRuntime = {};
    async function loadRuntime(src) {
      const key = src;
      if (loadedRuntime[key]) return;
      const url = new URL(src, window.location.origin).toString();
      let res;
      try {
        res = await fetch(url, { cache: "no-store" });
      } catch (e) {
        throw new Error("fetch failed for " + src + ": " + (e?.message || e));
      }
      if (!res.ok) throw new Error("HTTP " + res.status + " for " + src);
      const code = await res.text();
      const s = document.createElement("script");
      s.textContent = code;
      s.setAttribute("data-l2d-runtime", src);
      document.head.appendChild(s);
      loadedRuntime[key] = true;
    }

    function injectCss() {
      const old = document.getElementById("dsh-live2d-theme-css");
      if (old) old.remove();
      const style = document.createElement("style");
      style.id = "dsh-live2d-theme-css";
      style.textContent = cssText();
      document.head.appendChild(style);
    }

    function cssText() {
      const img = bgResolved || CONFIG.backgroundImage;
      const op = CONFIG.backgroundOpacity;
      const accent = CONFIG.accent;
      const imgLayer = img ? `url("${img}") center / cover no-repeat fixed, ` : "";
      const lightBg = imgLayer + CONFIG.gradientLight;
      const darkBg = imgLayer + CONFIG.gradientDark;
      const panelDark = img ? `
body[data-ds-dark-theme] {
  --dsw-alias-bg-base: rgba(16,16,22,${op}) !important;
  --dsw-alias-bg-layer-1: rgba(22,22,30,${op}) !important;
  --dsw-alias-bg-layer-2: rgba(28,28,38,${op}) !important;
  --dsw-alias-bg-layer-3: rgba(34,34,46,${op}) !important;
  --dsw-alias-bg-layer-4: rgba(40,40,54,${op}) !important;
  --dsw-alias-bg-module-platform: rgba(18,18,26,${op}) !important;
  --dsw-alias-bg-overlay: rgba(22,22,30,${op}) !important;
  --dsw-alias-settings-card-fill: rgba(24,24,34,${op}) !important;
  --dsw-specific-sidebar-fill: rgba(18,18,26,${op}) !important;
}` : "";
      const panelLight = img ? `
body:not([data-ds-dark-theme]) {
  --dsw-alias-bg-base: rgba(248,248,252,${op}) !important;
  --dsw-alias-bg-layer-1: rgba(244,244,250,${op}) !important;
  --dsw-alias-bg-layer-2: rgba(240,240,246,${op}) !important;
  --dsw-alias-bg-layer-3: rgba(236,236,242,${op}) !important;
  --dsw-alias-bg-layer-4: rgba(230,230,238,${op}) !important;
  --dsw-alias-bg-module-platform: rgba(250,250,254,${op}) !important;
  --dsw-alias-bg-overlay: rgba(244,244,250,${op}) !important;
  --dsw-alias-settings-card-fill: rgba(255,255,255,${op}) !important;
  --dsw-specific-sidebar-fill: rgba(248,248,252,${op}) !important;
}` : "";
      return `
/* ===== 主题色 ===== */
body {
  --dsw-alias-link: ${accent} !important;
  --dsw-alias-state-business-primary: ${accent} !important;
  --dsw-alias-button-info-fill: ${accent} !important;
  --dsw-alias-button-info-hover: ${accent} !important;
  --dsw-static-deepseek-500: ${accent} !important;
  --dsw-static-deepseek-400: ${accent} !important;
}
/* ===== 文本颜色（空字符串 = 跟随主题） ===== */
${CONFIG.textColor ? `body { --dsw-alias-label-primary: ${CONFIG.textColor} !important; }` : ""}
${CONFIG.textSecondaryColor ? `body { --dsw-alias-label-secondary: ${CONFIG.textSecondaryColor} !important; --dsw-alias-label-tertiary: ${CONFIG.textSecondaryColor} !important; --dsw-alias-label-caption: ${CONFIG.textSecondaryColor} !important; --dsw-alias-label-dimmed: ${CONFIG.textSecondaryColor} !important; }` : ""}
/* ===== 背景 ===== */
body[data-ds-dark-theme] { background: ${darkBg} !important; }
body:not([data-ds-dark-theme]) { background: ${lightBg} !important; }
${panelDark}
${panelLight}
#root, .mP3x-q_frame, [class*="-q_frame"] { background: transparent !important; }
/* ===== 看板娘 ===== */
#dsh-l2d-root {
  position: fixed;
  right: ${CONFIG.marginRight}px;
  bottom: ${CONFIG.marginBottom}px;
  width: ${CONFIG.modelWidth}px;
  height: ${CONFIG.modelHeight}px;
  z-index: 2147483000;
  pointer-events: auto;
  user-select: none;
  -webkit-user-select: none;
  transition: opacity .25s ease;
}
#dsh-l2d-root.dsh-l2d-hidden { opacity: 0; pointer-events: none; }
#dsh-l2d-canvas { width: 100%; height: 100%; display: block; }
#dsh-l2d-tools {
  position: absolute;
  top: 4px;
  right: 4px;
  display: flex;
  flex-direction: column;
  gap: 4px;
  z-index: 2;
}
#dsh-l2d-tools button {
  width: 26px;
  height: 26px;
  border-radius: 50%;
  border: 1px solid rgba(140,140,170,.35);
  background: rgba(22,22,30,.55);
  color: #cfcfe8;
  font-size: 13px;
  line-height: 1;
  cursor: pointer;
  backdrop-filter: blur(6px);
  -webkit-backdrop-filter: blur(6px);
}
#dsh-l2d-tools button:hover { background: rgba(60,60,90,.85); }
#dsh-l2d-grip { cursor: grab; }
#dsh-l2d-grip:active { cursor: grabbing; }
/* ===== 常驻入口按钮：即使看板娘隐藏，也总能打开设置面板 ===== */
#dsh-l2d-fab {
  position: fixed;
  right: 16px;
  bottom: 16px;
  width: 38px;
  height: 38px;
  border-radius: 50%;
  z-index: 2147483500;
  border: 1px solid rgba(150,150,190,.42);
  background: rgba(22,22,30,.78);
  color: #ffd1e3;
  font-size: 17px;
  line-height: 1;
  cursor: pointer;
  box-shadow: 0 4px 18px rgba(0,0,0,.35);
  backdrop-filter: blur(10px);
  -webkit-backdrop-filter: blur(10px);
}
#dsh-l2d-fab:hover { background: rgba(70,70,105,.92); }
#dsh-l2d-fab.dsh-l2d-fab-off { color: #8a8aa0; }
/* ===== 设置面板 ===== */
#dsh-l2d-panel {
  position: fixed;
  top: 70px;
  right: 16px;
  width: 288px;
  max-height: 72vh;
  overflow-y: auto;
  z-index: 2147483600;
  background: rgba(18,18,26,.94);
  color: #e6e6f0;
  border: 1px solid rgba(150,150,190,.35);
  border-radius: 12px;
  padding: 12px 14px;
  font-size: 13px;
  box-shadow: 0 12px 40px rgba(0,0,0,.45);
  backdrop-filter: blur(14px);
  -webkit-backdrop-filter: blur(14px);
}
#dsh-l2d-panel.dsh-l2d-panel-hidden { display: none; }
#dsh-l2d-panel .dsh-l2d-ph {
  display: flex; align-items: center; justify-content: space-between;
  font-weight: 600; margin-bottom: 8px; padding-bottom: 8px;
  border-bottom: 1px solid rgba(150,150,190,.22);
}
#dsh-l2d-panel .dsh-l2d-ph button {
  background: none; border: none; color: #aaa; font-size: 18px; cursor: pointer; line-height: 1;
}
#dsh-l2d-row, .dsh-l2d-row { margin: 9px 0; }
.dsh-l2d-row label { display: flex; justify-content: space-between; margin-bottom: 4px; color: #b9b9cc; }
.dsh-l2d-row label b { color: #ff9fc4; font-weight: 500; }
.dsh-l2d-row input[type="text"] {
  width: 100%; box-sizing: border-box; padding: 5px 7px;
  background: rgba(0,0,0,.35); color: #e6e6f0;
  border: 1px solid rgba(150,150,190,.3); border-radius: 6px; font-size: 12px;
}
.dsh-l2d-row input[type="range"] { width: 100%; accent-color: #ff6b9d; }
.dsh-l2d-row input[type="color"] { width: 100%; height: 28px; background: none; border: none; padding: 0; }
.dsh-l2d-row input[type="file"] { width: 100%; font-size: 11px; color: #b9b9cc; }
.dsh-l2d-row select {
  width: 100%; box-sizing: border-box; padding: 5px 7px;
  background: rgba(0,0,0,.35); color: #e6e6f0;
  border: 1px solid rgba(150,150,190,.3); border-radius: 6px; font-size: 12px;
}
.dsh-l2d-modelrow { display: flex; gap: 6px; }
.dsh-l2d-modelrow select { flex: 1; }
.dsh-l2d-mini {
  width: 30px; flex: none; padding: 0; border-radius: 6px; cursor: pointer;
  border: 1px solid rgba(150,150,190,.35); background: rgba(60,60,90,.5); color: #e6e6f0;
}
.dsh-l2d-actions { display: flex; gap: 8px; margin-top: 12px; }
.dsh-l2d-actions button {
  flex: 1; padding: 6px 8px; border-radius: 7px; cursor: pointer; font-size: 12px;
  border: 1px solid rgba(150,150,190,.35); background: rgba(60,60,90,.5); color: #e6e6f0;
}
.dsh-l2d-actions button:hover { background: rgba(90,90,130,.7); }
#dsh-l2d-hint { margin-top: 8px; font-size: 11px; color: #8f8fb0; min-height: 14px; }
#dsh-l2d-hint.ok { color: #7ae0a8; }
#dsh-l2d-hint.err { color: #ff8a8a; }
`;
    }

    function buildTools(root) {
      let tools = root.querySelector("#dsh-l2d-tools");
      if (tools) return tools;
      tools = document.createElement("div");
      tools.id = "dsh-l2d-tools";
      const gear = document.createElement("button");
      gear.textContent = "⚙";
      gear.title = "设置";
      gear.onclick = (e) => { e.stopPropagation(); togglePanel(); };
      const grip = document.createElement("button");
      grip.id = "dsh-l2d-grip";
      grip.textContent = "✥";
      grip.title = "拖动位置";
      const hide = document.createElement("button");
      hide.textContent = "🙈";
      hide.title = "隐藏/显示看板娘";
      hide.onclick = (e) => { e.stopPropagation(); toggleVisible(); };
      tools.append(gear, grip, hide);
      root.appendChild(tools);
      makeDraggable(root, grip);
      return tools;
    }

    function toggleVisible() {
      const root = document.getElementById("dsh-l2d-root");
      if (!root) return;
      root.classList.toggle("dsh-l2d-hidden");
      CONFIG.visible = !root.classList.contains("dsh-l2d-hidden");
      updateFabVisibility();
    }

    function makeDraggable(root, grip) {
      let dragging = false;
      let startX = 0, startY = 0, startRight = 0, startBottom = 0;
      grip.addEventListener("pointerdown", (e) => {
        e.preventDefault();
        e.stopPropagation();
        const rect = root.getBoundingClientRect();
        dragging = true;
        startX = e.clientX;
        startY = e.clientY;
        startRight = window.innerWidth - rect.right;
        startBottom = window.innerHeight - rect.bottom;
        grip.setPointerCapture?.(e.pointerId);
      });
      grip.addEventListener("pointermove", (e) => {
        if (!dragging) return;
        const rect = root.getBoundingClientRect();
        let right = startRight - (e.clientX - startX);
        let bottom = startBottom - (e.clientY - startY);
        right = Math.max(0, Math.min(window.innerWidth - rect.width, right));
        bottom = Math.max(0, Math.min(window.innerHeight - rect.height, bottom));
        root.style.right = right + "px";
        root.style.bottom = bottom + "px";
      });
      const end = () => {
        if (!dragging) return;
        dragging = false;
        const r = root.getBoundingClientRect();
        CONFIG.marginRight = Math.max(0, Math.round(window.innerWidth - r.right));
        CONFIG.marginBottom = Math.max(0, Math.round(window.innerHeight - r.bottom));
        root.style.right = CONFIG.marginRight + "px";
        root.style.bottom = CONFIG.marginBottom + "px";
      };
      grip.addEventListener("pointerup", end);
      grip.addEventListener("pointercancel", end);
      grip.addEventListener("lostpointercapture", end);
    }

    function fitModel() {
      if (!l2dModel) return;
      const w = CONFIG.modelWidth, h = CONFIG.modelHeight;
      const fitScale = Math.min(w / l2dNaturalW, h / l2dNaturalH) * 0.96;
      l2dModel.scale.set(fitScale);
      l2dModel.x = w / 2;
      l2dModel.y = h;
    }

    function applyModelSize() {
      const root = document.getElementById("dsh-l2d-root");
      if (root) {
        root.style.width = CONFIG.modelWidth + "px";
        root.style.height = CONFIG.modelHeight + "px";
      }
      if (l2dApp) {
        try { l2dApp.renderer.resize(CONFIG.modelWidth, CONFIG.modelHeight); } catch (e) { /* ignore */ }
      }
      fitModel();
    }

    // ---------- 设置面板 ----------
    function panelEl() { return document.getElementById("dsh-l2d-panel"); }

    function togglePanel() {
      const p = panelEl();
      if (!p) { buildPanel(); return; }
      p.classList.toggle("dsh-l2d-panel-hidden");
    }

    function hint(text, kind) {
      const el = document.getElementById("dsh-l2d-hint");
      if (!el) return;
      el.textContent = text || "";
      el.className = kind || "";
    }

    async function loadModelList() {
      const sel = document.getElementById("p-model");
      if (!sel) return;
      try {
        const url = new URL("/dsh-live2d-theme/models", window.location.origin).toString();
        const res = await fetch(url, { cache: "no-store" });
        const data = await res.json();
        const models = (data && data.models) || [];
        sel.innerHTML = "";
        if (models.length === 0) {
          const opt = document.createElement("option");
          opt.value = CONFIG.modelUrl;
          opt.textContent = "(models 目录为空)";
          sel.appendChild(opt);
        }
        for (const m of models) {
          const opt = document.createElement("option");
          opt.value = m.url;
          opt.textContent = m.name + (m.format ? " · " + m.format : "");
          sel.appendChild(opt);
        }
        const idx = models.findIndex((m) => m.url === CONFIG.modelUrl);
        if (idx >= 0) sel.selectedIndex = idx;
      } catch (e) {
        console.warn("[dsh-live2d-theme] load model list failed:", e?.message || e);
      }
    }

    function buildPanel() {
      if (panelEl()) return;
      const panel = document.createElement("div");
      panel.id = "dsh-l2d-panel";
      panel.innerHTML = `
        <div class="dsh-l2d-ph"><span>看板娘设置</span><button id="dsh-l2d-panel-close" title="关闭">×</button></div>
        <div class="dsh-l2d-row"><label>主色</label><input type="color" id="p-accent"></div>
        <div class="dsh-l2d-row"><label>主文本色</label><input type="color" id="p-text"></div>
        <div class="dsh-l2d-row"><label>次要文本色</label><input type="color" id="p-text2"></div>
        <div class="dsh-l2d-row"><label>背景透明度 <b id="p-opv"></b></label><input type="range" id="p-op" min="0" max="1" step="0.02"></div>
        <div class="dsh-l2d-row"><label>背景图</label><input type="text" id="p-bg" placeholder="/dsh-live2d-theme/background/bg.jpg"></div>
        <div class="dsh-l2d-row"><input type="file" id="p-upload" accept="image/*"></div>
        <div class="dsh-l2d-row"><label>看板娘模型</label>
          <div class="dsh-l2d-modelrow">
            <select id="p-model"></select>
            <button class="dsh-l2d-mini" id="p-model-refresh" title="重新扫描 models 目录">⟳</button>
          </div>
        </div>
        <div class="dsh-l2d-row"><label>看板娘宽 <b id="p-wv"></b></label><input type="range" id="p-w" min="120" max="600" step="10"></div>
        <div class="dsh-l2d-row"><label>看板娘高 <b id="p-hv"></b></label><input type="range" id="p-h" min="120" max="600" step="10"></div>
        <div class="dsh-l2d-row"><label>显示看板娘</label><input type="checkbox" id="p-vis"></div>
        <div class="dsh-l2d-row dsh-l2d-actions">
          <button id="p-save">保存</button>
          <button id="p-reset">恢复默认</button>
        </div>
        <div id="dsh-l2d-hint"></div>
      `;
      document.body.appendChild(panel);
      const $ = (id) => panel.querySelector("#" + id);
      const accent = $("p-accent"), op = $("p-op"), bg = $("p-bg"), up = $("p-upload"),
        w = $("p-w"), h = $("p-h"), vis = $("p-vis"), opv = $("p-opv"), wv = $("p-wv"), hv = $("p-hv"),
        text = $("p-text"), text2 = $("p-text2"), modelSel = $("p-model");

      const syncLabels = () => {
        opv.textContent = Math.round(op.value * 100) + "%";
        wv.textContent = w.value + "px";
        hv.textContent = h.value + "px";
      };
      accent.value = CONFIG.accent;
      op.value = CONFIG.backgroundOpacity;
      bg.value = CONFIG.backgroundImage || "";
      w.value = CONFIG.modelWidth;
      h.value = CONFIG.modelHeight;
      vis.checked = CONFIG.visible !== false;
      text.value = /^#[0-9a-f]{6}$/i.test(CONFIG.textColor || "") ? CONFIG.textColor : "#ececf6";
      text2.value = /^#[0-9a-f]{6}$/i.test(CONFIG.textSecondaryColor || "") ? CONFIG.textSecondaryColor : "#a9a9c4";
      syncLabels();

      accent.addEventListener("input", () => { CONFIG.accent = accent.value; injectCss(); });
      text.addEventListener("input", () => { CONFIG.textColor = text.value; injectCss(); });
      text2.addEventListener("input", () => { CONFIG.textSecondaryColor = text2.value; injectCss(); });
      op.addEventListener("input", () => { CONFIG.backgroundOpacity = parseFloat(op.value); syncLabels(); injectCss(); });
      w.addEventListener("input", () => {
        const oldW = CONFIG.modelWidth;
        const newW = parseInt(w.value, 10);
        // 以中心为锚点左右各扩/缩一半，避免看起来像在横向移动
        CONFIG.marginRight = Math.max(0, CONFIG.marginRight - Math.round((newW - oldW) / 2));
        CONFIG.modelWidth = newW;
        syncLabels(); injectCss(); applyModelSize();
      });
      h.addEventListener("input", () => {
        const oldH = CONFIG.modelHeight;
        const newH = parseInt(h.value, 10);
        // 以中心为锚点上下各扩/缩一半，避免看起来像在纵向移动
        CONFIG.marginBottom = Math.max(0, CONFIG.marginBottom - Math.round((newH - oldH) / 2));
        CONFIG.modelHeight = newH;
        syncLabels(); injectCss(); applyModelSize();
      });
      vis.addEventListener("change", () => { CONFIG.visible = vis.checked; const root = document.getElementById("dsh-l2d-root"); if (root) root.classList.toggle("dsh-l2d-hidden", !vis.checked); updateFabVisibility(); });
      bg.addEventListener("keydown", async (ev) => {
        if (ev.key !== "Enter") return;
        CONFIG.backgroundImage = bg.value.trim();
        await loadBackgroundImage();
        injectCss();
        hint(CONFIG.backgroundImage ? "已应用背景图" : "已清空背景图", "ok");
      });
      up.addEventListener("change", async () => {
        const file = up.files && up.files[0];
        if (!file) return;
        hint("上传中…");
        const ok = await uploadBackground(file);
        if (ok) { bg.value = CONFIG.backgroundImage; await loadBackgroundImage(); injectCss(); hint("背景图已上传并应用", "ok"); }
        else hint("上传失败", "err");
        up.value = "";
      });
      $("p-save").onclick = async () => {
        hint("保存中…");
        const ok = await saveConfig();
        hint(ok ? "已保存到 config.json" : "保存失败（看 Console）", ok ? "ok" : "err");
      };
      $("p-reset").onclick = () => {
        Object.assign(CONFIG, JSON.parse(JSON.stringify(DEFAULT_CONFIG)));
        accent.value = CONFIG.accent;
        op.value = CONFIG.backgroundOpacity;
        bg.value = CONFIG.backgroundImage;
        w.value = CONFIG.modelWidth;
        h.value = CONFIG.modelHeight;
        vis.checked = CONFIG.visible;
        text.value = /^#[0-9a-f]{6}$/i.test(CONFIG.textColor || "") ? CONFIG.textColor : "#ececf6";
        text2.value = /^#[0-9a-f]{6}$/i.test(CONFIG.textSecondaryColor || "") ? CONFIG.textSecondaryColor : "#a9a9c4";
        syncLabels();
        injectCss();
        applyModelSize();
        const root = document.getElementById("dsh-l2d-root");
        if (root) root.classList.toggle("dsh-l2d-hidden", !CONFIG.visible);
        updateFabVisibility();
        hint("已恢复默认（未保存则刷新后失效）");
      };
      $("p-model-refresh").onclick = () => loadModelList();
      modelSel.addEventListener("change", async () => {
        const url = modelSel.value;
        if (!url) return;
        const prev = CONFIG.modelUrl;
        CONFIG.modelUrl = url;
        try {
          hint("切换模型中…");
          await loadModel(url);
          hint("已切换：" + url.split("/").slice(-2)[0], "ok");
        } catch (e) {
          CONFIG.modelUrl = prev;
          hint("切换失败：" + (e?.message || e), "err");
        }
      });
      loadModelList();
      $("dsh-l2d-panel-close").onclick = () => togglePanel();
    }

    async function saveConfig() {
      try {
        const url = new URL("/dsh-live2d-theme/config", window.location.origin).toString();
        const res = await fetch(url, {
          method: "POST",
          headers: { "content-type": "application/json" },
          body: JSON.stringify(CONFIG),
        });
        const j = await res.json().catch(() => ({}));
        if (!res.ok || !j.ok) { console.warn("[dsh-live2d-theme] save failed:", j); return false; }
        return true;
      } catch (e) {
        console.warn("[dsh-live2d-theme] save error:", e?.message || e);
        return false;
      }
    }

    async function uploadBackground(file) {
      try {
        const dataUrl = await new Promise((resolve) => {
          const reader = new FileReader();
          reader.onload = () => resolve(typeof reader.result === "string" ? reader.result : "");
          reader.onerror = () => resolve("");
          reader.readAsDataURL(file);
        });
        if (!dataUrl) return false;
        const url = new URL("/dsh-live2d-theme/upload", window.location.origin).toString();
        const res = await fetch(url, {
          method: "POST",
          headers: { "content-type": "application/json" },
          body: JSON.stringify({ data: dataUrl }),
        });
        const j = await res.json().catch(() => ({}));
        if (!res.ok || !j.ok || !j.path) { console.warn("[dsh-live2d-theme] upload failed:", j); return false; }
        CONFIG.backgroundImage = j.path;
        return true;
      } catch (e) {
        console.warn("[dsh-live2d-theme] upload error:", e?.message || e);
        return false;
      }
    }

    async function startLive2D() {
      if (started) return;
      started = true;
      try {
        await loadRuntime(RUNTIME_SCRIPTS[0]);
        if (!window.Live2D) { console.warn("[dsh-live2d-theme] Cubism 2 core (Live2D) unavailable"); return; }
        await loadRuntime(RUNTIME_SCRIPTS[1]);
        if (!window.Live2DCubismCore) { console.warn("[dsh-live2d-theme] Cubism 4 core (Live2DCubismCore) unavailable"); return; }
        await loadRuntime(RUNTIME_SCRIPTS[2]);
        if (!window.PIXI) { console.warn("[dsh-live2d-theme] PIXI unavailable"); return; }
        await loadRuntime(RUNTIME_SCRIPTS[3]);
        if (!window.PIXI.live2d) { console.warn("[dsh-live2d-theme] PIXI.live2d unavailable"); return; }

        const root = document.createElement("div");
        root.id = "dsh-l2d-root";
        if (!CONFIG.visible) root.classList.add("dsh-l2d-hidden");
        const canvas = document.createElement("canvas");
        canvas.id = "dsh-l2d-canvas";
        root.appendChild(canvas);
        document.body.appendChild(root);
        buildTools(root);
        updateFabVisibility();

        const app = new window.PIXI.Application({
          view: canvas,
          width: CONFIG.modelWidth,
          height: CONFIG.modelHeight,
          transparent: true,
          autoStart: true,
          antialias: true,
          resolution: window.devicePixelRatio || 1,
          autoDensity: true,
        });
        l2dApp = app;
        await loadModel(CONFIG.modelUrl);
        console.info("[dsh-live2d-theme] Live2D ready");
      } catch (e) {
        console.warn("[dsh-live2d-theme] Live2D start failed:", e?.message || e);
        started = false;
      }
    }

    // 加载/切换模型：销毁旧模型，按新 URL 重新加载并自适应
    async function loadModel(url) {
      if (!l2dApp || !window.PIXI || !window.PIXI.live2d) {
        throw new Error("Live2D app not ready");
      }
      if (l2dModel) {
        try {
          l2dApp.stage.removeChild(l2dModel);
          l2dModel.destroy();
        } catch (e) { /* ignore */ }
        l2dModel = null;
      }
      const { Live2DModel } = window.PIXI.live2d;
      const modelUrl = new URL(url, window.location.origin).toString();
      const model = await Live2DModel.from(modelUrl);
      l2dModel = model;
      l2dNaturalW = model.width || 2;
      l2dNaturalH = model.height || 2;
      model.anchor.set(0.5, 1);
      l2dApp.stage.addChild(model);
      fitModel();
      try {
        model.autoInteract = true;
      } catch (e) {
        l2dApp.stage.interactive = true;
        l2dApp.stage.on("pointermove", (ev) => {
          try { model.focus(ev.data.global.x, ev.data.global.y); } catch (err) { /* ignore */ }
        });
      }
      console.info("[dsh-live2d-theme] model loaded:", modelUrl, "size", Math.round(l2dNaturalW) + "x" + Math.round(l2dNaturalH));
    }

    async function loadUserConfig() {
      try {
        const url = new URL("/dsh-live2d-theme/config.json", window.location.origin).toString();
        const res = await fetch(url, { cache: "no-store" });
        if (res.ok) {
          const user = await res.json();
          if (user && typeof user === "object") Object.assign(CONFIG, user);
        }
      } catch (e) { /* use defaults */ }
    }

    async function loadBackgroundImage() {
      bgResolved = "";
      if (!CONFIG.backgroundImage) return;
      try {
        const url = new URL(CONFIG.backgroundImage, window.location.origin).toString();
        const res = await fetch(url, { cache: "no-store" });
        if (!res.ok) { console.warn("[dsh-live2d-theme] background fetch http " + res.status); return; }
        const blob = await res.blob();
        bgResolved = await new Promise((resolve) => {
          const reader = new FileReader();
          reader.onload = () => resolve(typeof reader.result === "string" ? reader.result : "");
          reader.onerror = () => resolve("");
          reader.readAsDataURL(blob);
        });
        console.info("[dsh-live2d-theme] background loaded, data-uri len=" + bgResolved.length);
      } catch (e) {
        console.warn("[dsh-live2d-theme] background fetch failed:", e?.message || e);
        bgResolved = "";
      }
    }

    // 常驻入口按钮：看板娘可见时隐藏（用看板娘自带的 ⚙），隐藏/未加载时显示
    function updateFabVisibility() {
      const fab = document.getElementById("dsh-l2d-fab");
      if (!fab) return;
      const root = document.getElementById("dsh-l2d-root");
      const hidden = !root || root.classList.contains("dsh-l2d-hidden");
      fab.style.display = hidden ? "block" : "none";
    }

    function ensureFab() {
      let fab = document.getElementById("dsh-l2d-fab");
      if (!fab) {
        fab = document.createElement("button");
        fab.id = "dsh-l2d-fab";
        fab.textContent = "⚙";
        fab.title = "看板娘设置（隐藏后从这里重新打开）";
        fab.onclick = (e) => { e.stopPropagation(); togglePanel(); };
        document.body.appendChild(fab);
      }
      updateFabVisibility();
    }

    async function apply(ctx) {
      await loadUserConfig();
      await loadBackgroundImage();
      injectCss();
      ensureFab();
      const boot = () => startLive2D();
      if (document.readyState === "complete" || document.readyState === "interactive") {
        setTimeout(boot, 400);
      } else {
        window.addEventListener("load", () => setTimeout(boot, 400), { once: true });
      }
    }

    exports.name = name;
    exports.inject = inject;
    exports.apply = apply;
    return module.exports;
  },
});
