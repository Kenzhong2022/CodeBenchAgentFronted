# Ant Design CSS 变量清单（`--ant-*`）

> 配套文档：[Antd主题Token清单.md](Antd主题Token清单.md)（token 语义与层级）。
> 在线浏览：项目内置的 [CSS 变量浏览器](http://localhost:3000/css-vars?tab=preview)，源码在 [app/css-vars/page.tsx](app/css-vars/page.tsx)，实时扫描当前页面样式表中 antd 注入的全部 `--ant-*` 变量。

## 一、是什么

antd v6 默认开启 CSS 变量模式（cssVar），把主题 token 同时注入为 CSS 变量。token 与变量一一对应，**变量随主题算法（默认 / 暗色 / 紧凑）自动变化**，切换暗色模式时引用处无需改动任何代码。

```
token（camelCase）  →  CSS 变量（kebab-case，加 --ant- 前缀）
colorPrimary        →  --ant-color-primary
colorBgContainer    →  --ant-color-bg-container
borderRadiusLG      →  --ant-border-radius-lg
```

## 二、命名规则

| 类型 | 规则 | 示例 |
|---|---|---|
| 全局 token | `--ant-` + token 名的 kebab-case | `colorTextSecondary` → `--ant-color-text-secondary` |
| 预设色板 | `--ant-{色名}` 或 `--ant-{色名}-{档位}` | `--ant-geekblue`、`--ant-blue-5` |
| 组件 token | `--ant-{组件名}-{token kebab-case}` | `Layout.Sider siderBg` → `--ant-layout-sider-bg` |

> 速记：把 token 的驼峰拆成 `-` 连接的小写单词，前面加 `--ant-` 即可；组件 token 再加组件名做第一段。

## 三、作用域：全局 vs 组件

- **全局变量**（`--ant-color-*`、`--ant-font-*`、`--ant-size-*`、`--ant-border-*`、`--ant-padding-*`、`--ant-margin-*`、`--ant-box-shadow-*` 等）：定义在 `:root` / 全局类作用域，**任意位置均可引用**。
- **组件级变量**（如 `--ant-layout-sider-bg`）：只在该组件的类名作用域（`.ant-layout-sider` 等）内定义，**在组件外引用会得到空值**。引用组件级变量时，样式必须位于该组件 DOM 的子树内，或选择器带上对应 `.ant-*` 类（见 [HeroBanner.tsx](app/CodeAgent/components/HeroBanner.tsx) 引用 `--ant-layout-header-bg` 的写法）。
- 变量在**组件首次渲染后**才注入样式表；从未渲染过的组件，其变量在页面上不存在。

## 四、使用方式

### 1. 内联样式（最常用）

```tsx
<div style={{ background: "var(--ant-color-bg-container)" }} />
```

### 2. 自定义 CSS / CSS 模块

```css
.my-card {
  background: var(--ant-color-bg-container);
  border: 1px solid var(--ant-color-border-secondary);
  border-radius: var(--ant-border-radius-lg);
}
```

### 3. Tailwind 任意值（本项目 Tailwind v4）

```tsx
<div className="bg-[var(--ant-color-bg-container)] text-[var(--ant-color-text)]" />
```

### 4. 无法用变量的场景：JS 传实值

ECharts canvas、截图库等 **JS 内部消费颜色的场景无法解析 `var()`**，此时用 `theme.useToken()` 拿解析后的实值（参见 [heatmapTheme.ts](app/CodeAgent/components/heatmapTheme.ts) 的 `buildDefaultTheme`）：

```tsx
const { token } = theme.useToken();
echartsOption.color = token.colorPrimary; // 实值，如 "#1677ff"
```

## 五、常用全局变量速查

与 token 清单的「用例速查」一一对应：

| 场景 | CSS 变量 |
|---|---|
| 卡片 / 内容区背景 | `--ant-color-bg-container` |
| 页面整体背景 / 面板底色 | `--ant-color-bg-layout` |
| 浮层背景（Modal / Dropdown） | `--ant-color-bg-elevated` |
| 深色横幅、Tooltip 类深色底 | `--ant-color-bg-spotlight` |
| 正文 / 标题 / 辅助文字 | `--ant-color-text` / `--ant-color-text-heading` / `--ant-color-text-description` |
| 四级中性文本 | `--ant-color-text-secondary` / `-tertiary` / `-quaternary` |
| 深色背景上的白字 | `--ant-color-white`、`--ant-color-text-light-solid` |
| 边框 / 分割线 | `--ant-color-border` / `--ant-color-border-secondary` / `--ant-color-split` |
| 填充四级梯度（hover、斑马纹等） | `--ant-color-fill` / `-secondary` / `-tertiary` / `-quaternary` |
| 品牌色及梯度 | `--ant-color-primary`、`--ant-color-primary-bg`、`--ant-color-primary-border`、`--ant-color-primary-hover`、`--ant-color-primary-active`、`--ant-color-primary-text` |
| 功能色（成功 / 警告 / 错误 / 信息） | `--ant-color-success`、`--ant-color-warning`、`--ant-color-error`、`--ant-color-info` 及对应 `-bg` / `-border` / `-text` 梯度 |
| 圆角 | `--ant-border-radius-xs` / `-sm` / ``(无后缀)`` / `-lg` / `-outer` |
| 字号 | `--ant-font-size-sm` / ``--ant-font-size`` / `-lg` / `-xl` |
| 间距 | `--ant-padding-xxs` ~ `--ant-padding-xl`、`--ant-margin-xxs` ~ `--ant-margin-xxl` |
| 尺寸 | `--ant-size-xxs` ~ `--ant-size-xxl`、`--ant-control-height` 及 `-sm` / `-lg` |
| 阴影 | `--ant-box-shadow` / `-secondary` / `-tertiary` |

> 表中带引号的「无后缀」项：`borderRadius`、`fontSize`、`padding`、`margin`、`size`、`boxShadow` 的变量名不加档位后缀，如 `--ant-font-size`、`--ant-border-radius`。

## 六、与 token 的选择建议

| 场景 | 用什么 |
|---|---|
| JSX 内联样式 / CSS 文件 / Tailwind | CSS 变量（`var(--ant-*)`），少一层 JS 依赖，字符串可读性更好 |
| React 组件需要把颜色传给第三方 JS 库（图表 / canvas） | `theme.useToken()` 实值 |
| 需要根据颜色做计算（插值、对比度） | `theme.useToken()` 实值，如 `lighten(token.colorPrimary, 0.3)` |
| 主题定制（改品牌色、暗色派生） | `ConfigProvider theme.token` / `theme.algorithm`（见 [AntdConfigProvider.tsx](components/AntdConfigProvider.tsx)） |

## 七、注意事项

1. **组件级变量出域即空**：在自定义 CSS 中引用 `--ant-layout-sider-bg` 之类，选择器必须落在该组件子树内；全局变量无此限制。
2. **扫描页结果依赖已渲染组件**：CSS 变量浏览器扫的是「应用已渲染过」的组件，新组件渲染一次后再点「重新扫描」。
3. **暗色模式下预设色板不随算法派生**（`--ant-geekblue` 等为静态色值），做主色梯度请用 `--ant-color-primary-*` 系列而非预设色。
4. **不要写死十六进制**：项目内自定义样式一律走 `var(--ant-*)` 或 `theme.useToken()`，保证明暗算法切换时自动适配。
