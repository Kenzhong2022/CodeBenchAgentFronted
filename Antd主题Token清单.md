# Ant Design 主题 Token 全清单（`theme.useToken().token`）

> 来源：项目安装的 antd v6 类型定义（`node_modules/antd/es/theme/interface/`），按官方注释整理。
> Antd 的 token 分三层派生：**Seed（种子）→ Map（映射）→ Alias（别名）**。
> `theme.useToken().token` 返回的是 **Alias 层的全量合集**，即包含下文所有 token。

## 使用方式

```tsx
"use client";

import { theme } from "antd";

export default function MyComponent() {
  const { token } = theme.useToken();

  return (
    <div
      style={{
        background: token.colorBgContainer,   // 容器背景色
        borderRadius: token.borderRadiusLG,   // 大圆角
        color: token.colorText,               // 一级文本色
      }}
    />
  );
}
```

**为什么用 token 而不是写死颜色**：token 跟随 `ConfigProvider` 的主题算法（默认算法 / 暗色算法 `theme.darkAlgorithm` / 紧凑算法 `theme.compactAlgorithm`）自动派生。切换暗色模式时，`colorBgContainer`、`colorText` 等全部自动变为暗色系取值，无需手动写 `dark:` 分支。

---

## 一、品牌色与功能色梯度（Map 层）

每个功能色都有一套完整的梯度：`主色 → 浅色背景(Bg) → 描边(Border) → 悬浮(Hover) → 激活(Active) → 文本(Text)`。

### 1. 品牌主色（Primary）

| Token | 中文名 | 说明与应用场景 |
|---|---|---|
| `colorPrimary` | 品牌主色 | 产品的主色调。用于主按钮背景、主图标、选中态、链接强调等一切"品牌色"场景 |
| `colorPrimaryBg` | 主色浅色背景 | 视觉层级较弱的选中态背景，如 Menu 选中项、Checkbox 背景 |
| `colorPrimaryBgHover` | 主色浅色背景悬浮态 | `colorPrimaryBg` 对应的悬浮态 |
| `colorPrimaryBorder` | 主色描边色 | 主色梯度下的描边，如 Slider 描边 |
| `colorPrimaryBorderHover` | 主色描边悬浮态 | 描边的悬浮态，如 Slider、Button 描边 hover |
| `colorPrimaryHover` | 主色悬浮态 | 主色按钮 hover 时显示的颜色 |
| `colorPrimaryActive` | 主色激活态 | 主色按下时的深色 |
| `colorPrimaryText` | 主色文本 | 主色梯度下的文本颜色 |
| `colorPrimaryTextHover` / `colorPrimaryTextActive` | 主色文本悬浮/激活态 | 主色文本的交互态 |

### 2. 成功 / 警告 / 错误 / 信息色

四组结构相同，以成功色为例（Warning / Error / Info 同理，把 `Success` 换成 `Warning`、`Error`、`Info` 即可）：

| Token | 应用场景 |
|---|---|
| `colorSuccess` | 成功主色。Result 成功页、Progress 已完成、Tag 成功标签 |
| `colorSuccessBg` | 成功态浅色背景。Alert success、Tag success 的背景 |
| `colorSuccessBgHover` | 成功浅色背景悬浮态（antd 目前未直接使用） |
| `colorSuccessBorder` / `colorSuccessBorderHover` | 成功态描边及悬浮态。Alert、Tag 的边框 |
| `colorSuccessHover` / `colorSuccessActive` | 成功色深色悬浮 / 激活态 |
| `colorSuccessText` / `colorSuccessTextHover` / `colorSuccessTextActive` | 成功色文本及交互态 |

- `colorWarning`：警戒色。Alert warning、Input 校验警告、Notification
- `colorError`：错误色。错误按钮、Result 失败页、表单校验失败（danger 按钮 = colorError）
- `colorInfo`：信息色。Alert info、Tag info、Progress

### 3. 错误色的额外梯度

| Token | 说明 |
|---|---|
| `colorErrorBgFilledHover` | 危险填充按钮 hover 时的浅色填充背景 |
| `colorErrorBgActive` | 错误浅色背景的激活态 |

### 4. 超链接色

| Token | 说明 |
|---|---|
| `colorLink` | 超链接默认颜色 |
| `colorLinkHover` | 链接悬浮颜色 |
| `colorLinkActive` | 链接被点击时颜色 |

### 5. 中性功能色（与主题算法无关的固定色）

| Token | 说明 |
|---|---|
| `colorWhite` | 纯白 `#FFFFFF`，不随主题变化。深色背景上的文字/图标常用 |
| `colorBgMask` | 浮层蒙层颜色。Modal、Drawer、Image 预览的半透明遮罩 |

---

## 二、中性色（Map 层 · Neutral）

### 1. 文本色梯度（由深到浅四级）

| Token | 中文名 | 应用场景 |
|---|---|---|
| `colorText` | 一级文本色 | 最深的主文本色，正文默认色，符合 W3C 对比度标准 |
| `colorTextSecondary` | 二级文本色 | 不需要强调的文本，如 Label、Menu 文本 |
| `colorTextTertiary` | 三级文本色 | 描述性文本，如表单补充说明、列表描述 |
| `colorTextQuaternary` | 四级文本色 | 最浅文本，如输入提示、禁用文本 |

### 2. 边框色

| Token | 说明 |
|---|---|
| `colorBorder` | 一级边框色，默认边框，用于表单控件、分隔等 |
| `colorBorderSecondary` | 二级边框色（更浅），与 `colorSplit` 同色但是实色 |
| `colorBorderDisabled` | 禁用态边框色 |

### 3. 填充色梯度（四级，由深到浅）

| Token | 应用场景 |
|---|---|
| `colorFill` | 最深填充色，目前只用于 Slider 的 hover 效果 |
| `colorFillSecondary` | 较明显填充，如 Rate、Skeleton；也作 Table 行 hover |
| `colorFillTertiary` | 默认推荐填充色，勾勒元素形体，如 Slider、Segmented |
| `colorFillQuaternary` | 最弱填充色，不易引起注意的色块，如斑马纹 |

### 4. 背景色（最重要的四个背景 token）

| Token | 中文名 | 应用场景 |
|---|---|---|
| `colorBgLayout` | 布局背景色 | 页面整体布局背景（B1 视觉层级），如 `Layout` 最外层背景 |
| `colorBgContainer` | 组件容器背景色 | 默认按钮、输入框、卡片等容器背景。**最常用** |
| `colorBgElevated` | 浮层容器背景色 | Modal、Dropdown、Menu 等浮层。暗色模式下比 `colorBgContainer` 亮一级以区分层级 |
| `colorBgSpotlight` | 引起注意的背景色 | 强关注场景，目前用于 Tooltip 背景。**两种模式下都是深色**，深色横幅/深色代码块可用 |
| `colorBgBlur` | 毛玻璃容器背景色 | 毛玻璃（frosted glass）容器，通常为透明色 |
| `colorBgSolid` / `colorBgSolidHover` / `colorBgSolidActive` | 实心背景色及交互态 | 默认实心按钮（primary 类）的背景三态 |

> 项目示例：[PageLayout.tsx](components/PageLayout.tsx) 用 `colorBgContainer` 作为内容区背景；[HeroBanner.tsx](app/CodeAgent/components/HeroBanner.tsx) 用 `colorBgSpotlight` 做深色横幅。

---

## 三、预设色板（Seed 层 · PresetColorType）

直接以色名作为 token key，返回对应色板的基础色。多用于自定义 Tag、徽标等需要语义色但不想蹭品牌色的场景：

`volcano`（火山橘）、`gold`（金）、`orange`（橙）、`yellow`（黄）、`lime`（青柠）、`green`（绿）、`cyan`（青）、`blue`（蓝）、`geekblue`（极客蓝）、`purple`（紫）、`magenta`（洋红）、`pink`（粉）

---

## 四、字体与行高（Seed + Map 层）

### 1. 字体家族与字号

| Token | 默认值 | 说明与应用场景 |
|---|---|---|
| `fontFamily` | 系统字体栈 | 全局默认字体家族 |
| `fontFamilyCode` | 等宽字体栈 | 代码字体，Typography 的 code/pre/kbd |
| `fontSizeSM` | 12 | 小号字体。徽标、辅助说明 |
| `fontSize` | 14 | **默认字号**，全组件基础字号 |
| `fontSizeLG` | 16 | 大号字体。强调文本 |
| `fontSizeXL` | 20 | 超大号字体 |
| `fontSizeHeading1` | 38 | h1 标题字号 |
| `fontSizeHeading2` | 30 | h2 标题字号 |
| `fontSizeHeading3` | 24 | h3 标题字号 |
| `fontSizeHeading4` | 20 | h4 标题字号 |
| `fontSizeHeading5` | 16 | h5 标题字号 |

### 2. 行高

| Token | 说明 |
|---|---|
| `lineHeight` / `lineHeightSM` / `lineHeightLG` | 普通文本行高三档 |
| `lineHeightHeading1` ~ `lineHeightHeading5` | 一~五级标题行高（1.4 / 1.35 / 1.3 / 1.25 / 1.2） |

---

## 五、圆角与线条（Seed + Map 层）

| Token | 默认值 | 说明与应用场景 |
|---|---|---|
| `borderRadiusXS` | 2 | 极小圆角。Segmented、箭头等内部小圆角 |
| `borderRadiusSM` | 4 | 小圆角。小尺寸的 Button、Input |
| `borderRadius` | 6 | **基础圆角**。按钮、输入框、卡片默认 |
| `borderRadiusLG` | 8 | 大圆角。Card、Modal 等大容器 |
| `borderRadiusOuter` | 4 | 外部圆角 |
| `lineWidth` | 1 | 基础线宽。组件边框、分割线 |
| `lineWidthBold` | 2 | 加粗线宽 |
| `lineWidthFocus` | 聚焦态线宽 |
| `lineType` | `solid` | 线条样式（实线/虚线） |

---

## 六、尺寸与高度（Seed + Map 层）

### 1. 通用尺寸梯度

| Token | 默认值 | 说明 |
|---|---|---|
| `sizeXXS` | 4 | 最小尺寸 |
| `sizeXS` | 8 | 小尺寸 |
| `sizeSM` | 12 | 中小尺寸 |
| `sizeMS` | 16 | 与 `size` 相同，紧凑模式下更大 |
| `size` | 16 | 中等尺寸 |
| `sizeMD` | 20 | 中大尺寸 |
| `sizeLG` | 24 | 大尺寸 |
| `sizeXL` | 32 | 超大尺寸 |
| `sizeXXL` | 48 | 最大尺寸 |
| `sizeUnit` | 4 | 尺寸变化单位（一切尺寸的基数字） |
| `sizeStep` | 4 | 尺寸步长（紧凑模式下为 2） |

### 2. 控件高度

| Token | 说明 |
|---|---|
| `controlHeight` | 基础控件高度（默认 32），Button、Input 等默认 |
| `controlHeightSM` / `controlHeightXS` | 小尺寸控件高度 |
| `controlHeightLG` | 大尺寸控件高度 |
| `controlInteractiveSize` | 控件可交互元素的大小（如 Switch 滑块） |

---

## 七、间距（Alias 层）

### 1. 内边距 padding（由小到大）

`paddingXXS`(4) → `paddingXS`(8) → `paddingSM`(12) → `padding`(16) → `paddingMD`(20) → `paddingLG`(24) → `paddingXL`(32)

内容型内边距（用于紧凑排列的内容）：

| Token | 说明 |
|---|---|
| `paddingContentHorizontalSM` / `paddingContentHorizontal` / `paddingContentHorizontalLG` | 内容水平内边距三档 |
| `paddingContentVerticalSM` / `paddingContentVertical` / `paddingContentVerticalLG` | 内容垂直内边距三档 |

### 2. 外边距 margin（由小到大）

`marginXXS`(4) → `marginXS`(8) → `marginSM`(12) → `margin`(16) → `marginMD`(20) → `marginLG`(24) → `marginXL`(32) → `marginXXL`(48)

> 经验法则：**同组件内部元素间距用 padding 系列，组件之间的间距用 margin 系列**；自定义样式时优先用这两个梯度而不是随手写 px，保证与 antd 组件的呼吸感一致。

---

## 八、阴影（Alias 层）

| Token | 说明与应用场景 |
|---|---|
| `boxShadow` | 一级阴影。下拉菜单、浮层卡片的悬浮感 |
| `boxShadowSecondary` | 二级阴影。更弱的浮层阴影 |
| `boxShadowTertiary` | 三级阴影。最弱的阴影，如卡片轻悬浮 |
| `opacityLoading` | 加载状态透明度 |

---

## 九、Alias 层专用 token（细化派生）

### 1. 语义化文本色

| Token | 说明与应用场景 |
|---|---|
| `colorTextHeading` | 标题文本色。h1~h5、Typography.Title |
| `colorTextLabel` | 文本标签色。表单 Label |
| `colorTextDescription` | 文本描述色。辅助说明文字（与 `Typography.Text type="secondary"` 视觉一致） |
| `colorTextPlaceholder` | 占位文本色。Input placeholder |
| `colorTextDisabled` | 禁用文本色 |
| `colorTextLightSolid` | 带背景色上的高亮文本。Primary Button 内的白字 |
| `colorTextQuaternary` 等 | 同 Map 层四级文本梯度 |

### 2. 语义化背景与图标色

| Token | 说明与应用场景 |
|---|---|
| `colorFillContent` / `colorFillContentHover` | 内容区域填充色及悬浮态（如 Table 选中行） |
| `colorFillAlter` | 替代背景色。Table 斑马纹、列表隔行变色 |
| `colorBgContainerDisabled` | 禁用容器的背景色 |
| `colorBgTextHover` / `colorBgTextActive` | 文本型按钮的悬浮 / 激活背景 |
| `colorIcon` / `colorIconHover` | 弱操作图标颜色及悬浮态。Input 的 allowClear、Alert 关闭按钮 |
| `colorHighlight` | 页面元素高亮色 |
| `colorSplit` | 分割线颜色（带透明度的 `colorBorderSecondary`） |
| `colorBorderBg` | 背景边框色 |

### 3. 控件交互态

| Token | 说明与应用场景 |
|---|---|
| `controlOutline` | 输入组件聚焦时的外轮廓颜色 |
| `controlOutlineWidth` | 外轮廓宽度 |
| `controlTmpOutline` | 默认按钮/Switch 的默认 outline（已废弃，不建议使用） |
| `controlItemBgHover` | 可选项（如 Select 下拉项）悬浮背景 |
| `controlItemBgActive` | 可选项选中背景。Select 选中项、Menu 选中项 |
| `controlItemBgActiveHover` | 选中且悬浮的背景 |
| `controlItemBgActiveDisabled` | 禁用态下的选中背景 |
| `controlPaddingHorizontal` / `controlPaddingHorizontalSM` | 控件内水平内边距（Input、Select 等） |
| `fontSizeIcon` | 操作图标字号（Select 箭头、Cascader 等） |
| `colorWarningOutline` / `colorErrorOutline` | 校验警告 / 错误状态的外轮廓颜色 |
| `colorWarningAffix` / `colorErrorAffix` | 前后缀在警告 / 错误状态下的颜色 |
| `fontWeightStrong` | 标题 / 选中项的字重 |

### 4. 链接装饰

| Token | 说明 |
|---|---|
| `linkDecoration` / `linkHoverDecoration` / `linkFocusDecoration` | 链接默认 / 悬浮 / 聚焦时的 text-decoration |

### 5. 响应式断点（像素值，用于自定义媒体查询）

| Token | 值 | 说明 |
|---|---|---|
| `screenXS`（`screenXSMin/Max`） | 480 | 超小屏（手机） |
| `screenSM`（`screenSMMin/Max`） | 576 | 小屏 |
| `screenMD`（`screenMDMin/Max`） | 768 | 中屏（平板） |
| `screenLG`（`screenLGMin/Max`） | 992 | 大屏（笔记本） |
| `screenXL`（`screenXLMin/Max`） | 1200 | 超大屏（桌面） |
| `screenXXL`（`screenXXLMin/Max`） | 1600 | 超超大屏 |
| `screenXXXL`（`screenXXXLMin/Max`） | 2000 | 巨幕屏 |

---

## 十、Seed 层其他全局配置（影响派生结果）

这些 token 主要在 `ConfigProvider theme.token` 里配置，日常从 `useToken` 读取的机会较少：

| Token | 默认值 | 说明 |
|---|---|---|
| `colorTextBase` / `colorBgBase` | — | 文本色 / 背景色派生的种子。**不要在业务代码直接使用**，仅用于主题定制 |
| `colorLink` | — | 链接色种子 |
| `zIndexBase` | 0 | 基础 Z 轴（BackTop、Affix 等） |
| `zIndexPopupBase` | 1000 | 浮层基础 Z 轴（Modal、FloatButton 等） |
| `opacityImage` | 1 | 图片不透明度（暗色系主题可调低） |
| `motionUnit` / `motionBase` | 100 / 0 | 动画时长单位 / 基础时长 |
| `motionEaseOut` 等系列 | — | 预设动效缓动曲线（easeOut、easeInOut、easeOutBack 等） |
| `sizePopupArrow` | — | 气泡类组件箭头尺寸 |
| `wireframe` | false | 线框风格（V4 视觉） |
| `focusOutline` | true | 聚焦时是否显示可见描边 |
| `motion` | true | 是否开启动画 |

---

## 十一、项目中的实际用例速查

| 场景 | 推荐 token |
|---|---|
| 卡片 / 内容区背景 | `colorBgContainer` |
| 页面整体背景 | `colorBgLayout` |
| 深色横幅、深色代码块、Tooltip 类深色底 | `colorBgSpotlight` |
| Modal / Dropdown 等浮层 | `colorBgElevated` |
| 正文 / 标题 / 辅助文字 | `colorText` / `colorTextHeading` / `colorTextDescription` |
| 表单 Label、placeholder、禁用文本 | `colorTextLabel` / `colorTextPlaceholder` / `colorTextDisabled` |
| 深色背景上的文字 | `colorWhite` 或 `colorTextLightSolid` |
| 边框 / 分割线 | `colorBorder` / `colorSplit` |
| hover 行背景、斑马纹 | `colorFillContentHover` / `colorFillAlter` |
| 圆角（大容器） | `borderRadiusLG` |
| 间距 | `paddingSM`~`paddingLG`、`margin` 系列 |
| 阴影 | `boxShadow` / `boxShadowSecondary` / `boxShadowTertiary` |
| 品牌色强调 | `colorPrimary`（背景）、`colorPrimaryText`（文字）、`colorPrimaryBg`（弱选中） |
| 校验反馈 | `colorError`、`colorWarning`、`colorSuccess`、`colorInfo` 及其 Bg/Border 梯度 |
