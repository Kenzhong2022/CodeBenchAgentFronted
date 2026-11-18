"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import { Button, Card, Input, Space, Spin, Typography, theme } from "antd";
import { DownloadOutlined, ReloadOutlined } from "@ant-design/icons";
import PageLayout from "@/components/PageLayout";
import PageHeader from "@/components/PageHeader";

// 全局 token 的首段前缀：这些变量不属于任何组件，定义在全局作用域
const GLOBAL_SEGMENTS = new Set([
  "color",
  "font",
  "size",
  "line",
  "border",
  "padding",
  "margin",
  "box",
  "screen",
  "control",
  "motion",
  "opacity",
  "z",
  "wireframe",
  "focus",
]);

// 扫描到的单个 CSS 变量信息
type CssVarInfo = {
  name: string; // 变量名，如 --ant-layout-sider-bg
  scope: string; // 声明该变量的选择器（作用域）
  rawValue: string; // 样式表中的原始值，可能是 var() 引用
  value: string; // 实际渲染值（原始值不可解析时回退到 rawValue）
};

// 从页面所有样式表中收集 --ant-* 变量声明（取每个变量首次出现的声明）
function collectAntCssVars(): {
  name: string;
  scope: string;
  rawValue: string;
}[] {
  const found = new Map<string, { selector: string; value: string }>();
  const visit = (rules: CSSRuleList) => {
    for (const rule of Array.from(rules)) {
      if (rule instanceof CSSStyleRule) {
        if (!rule.selectorText) continue;
        for (const prop of Array.from(rule.style)) {
          if (prop.startsWith("--ant-") && !found.has(prop)) {
            found.set(prop, {
              selector: rule.selectorText,
              value: rule.style.getPropertyValue(prop).trim(),
            });
          }
        }
      } else if ("cssRules" in rule) {
        // @media / @supports / @layer 等包裹规则，递归下钻
        visit((rule as CSSMediaRule).cssRules);
      }
    }
  };
  for (const sheet of Array.from(document.styleSheets)) {
    try {
      visit(sheet.cssRules);
    } catch {
      // 跨域样式表无法读取，跳过
    }
  }
  return Array.from(found.entries()).map(([name, { selector, value }]) => ({
    name,
    scope: selector,
    rawValue: value,
  }));
}

// 通过构建嵌套探针元素解析变量的实际渲染值（组件级变量只在对应组件类名作用域下定义）
function resolveValue(scope: string, varName: string): string {
  // 按空白拆分选择器，每段保留全部类名——包括 .css-var-rX 哈希作用域类
  // （antd 组件元素真实带有该类，规则匹配依赖它，丢弃会导致组件级变量解析不到），
  // 仅忽略伪类 / 伪元素（:hover、::before 等）
  const parts = scope
    .split(/\s+/)
    .map((part) => (part.match(/\.[A-Za-z][-\w]*/g) ?? []).join(" "))
    .filter(Boolean);
  if (parts.length === 0) return "";
  const root = document.createElement("div");
  root.style.cssText =
    "position:absolute;left:-99999px;opacity:0;pointer-events:none;";
  let current = root;
  for (const className of parts) {
    const el = document.createElement("div");
    el.className = className;
    current.appendChild(el);
    current = el;
  }
  document.body.appendChild(root);
  const value = getComputedStyle(current).getPropertyValue(varName).trim();
  root.remove();
  return value;
}

// 判断值能否作为颜色渲染：长度 / 时间曲线 / 阴影 / 字体族等返回 false，
// 这类变量渲染成背景色块只会得到透明，需要改用文本展示
function isColorLike(value: string): boolean {
  return !!value && CSS.supports("color", value);
}

// 静态变量文件（public/ant-css-vars.json）的单个变量条目
type StaticVarEntry = {
  name: string; // 变量名，如 --ant-layout-sider-bg
  scope: string; // 声明该变量的选择器（组件级变量只在组件类名作用域内生效）
  rawValue: string; // 样式表原始值，可能是 var() 引用
  value: string; // 解析后的实际渲染值
};

// 静态变量文件的顶层格式：按全局 token（key 固定 "global"）/ 组件首段分组，
// exportedAt 记录快照时间，方便人读与脚本消费
type StaticVarDump = {
  exportedAt: string;
  total: number;
  groups: Record<string, StaticVarEntry[]>;
};

// 从扁平变量列表构建分组快照：全局 token 归入 "global"，其余按变量名首段（组件名）分组
function buildVarDump(vars: CssVarInfo[]): StaticVarDump {
  const groups: Record<string, StaticVarEntry[]> = {};
  for (const info of vars) {
    const segment = info.name.replace("--ant-", "").split("-")[0];
    const groupKey = GLOBAL_SEGMENTS.has(segment) ? "global" : segment;
    const list = groups[groupKey] ?? [];
    list.push({
      name: info.name,
      scope: info.scope,
      rawValue: info.rawValue,
      value: info.value || info.rawValue,
    });
    groups[groupKey] = list;
  }
  return {
    exportedAt: new Date().toISOString(),
    total: vars.length,
    groups,
  };
}

// 快照文件 → 渲染用的扁平列表（条目结构与 CssVarInfo 同构）
function dumpToVars(dump: StaticVarDump): CssVarInfo[] {
  return Object.values(dump.groups).flat();
}

/**
 * @description CSS 变量浏览器：实时扫描页面样式表中 antd 注入的全部 --ant-* 变量，
 *              按全局 / 组件分组展示变量名与实际渲染值；扫描结果取决于应用已渲染过的组件
 */
export default function CssVarsPage() {
  const { token } = theme.useToken();
  const [vars, setVars] = useState<CssVarInfo[] | null>(null);
  const [keyword, setKeyword] = useState("");
  // 数据来源：static = public/ant-css-vars.json 快照；scan = 实时扫描样式表
  const [source, setSource] = useState<"scan" | "static">("scan");
  const [staticExportedAt, setStaticExportedAt] = useState<string | null>(null);

  // 实时扫描：结果取决于应用已渲染过的组件
  const scan = useCallback(() => {
    const collected = collectAntCssVars().map((info) => ({
      ...info,
      value: resolveValue(info.scope, info.name) || info.rawValue,
    }));
    setVars(collected);
    setSource("scan");
    setStaticExportedAt(null);
  }, []);

  // 优先加载静态快照 public/ant-css-vars.json（离线文档场景，可读格式见 StaticVarDump）；
  // 文件不存在（404）或解析失败时回退实时扫描
  useEffect(() => {
    let cancelled = false;
    fetch("/ant-css-vars.json")
      .then((res) => (res.ok ? res.json() : null))
      .then((dump) => {
        if (cancelled) return;
        if (dump?.groups) {
          setVars(dumpToVars(dump as StaticVarDump));
          setStaticExportedAt((dump.exportedAt as string) ?? null);
          setSource("static");
        } else {
          scan();
        }
      })
      .catch(() => {
        if (!cancelled) scan();
      });
    return () => {
      cancelled = true;
    };
  }, [scan]);

  // 导出当前列表为可读 JSON 快照：下载后放入 public/ 即成为静态变量文件
  const downloadDump = () => {
    if (!vars) return;
    const blob = new Blob([JSON.stringify(buildVarDump(vars), null, 2)], {
      type: "application/json",
    });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = "ant-css-vars.json";
    a.click();
    URL.revokeObjectURL(url);
  };

  // 按首段分组：color/font/size 等属于全局 token，其余视为组件 token
  const groups = useMemo(() => {
    if (!vars) return [];
    const map = new Map<string, CssVarInfo[]>();
    for (const info of vars) {
      const segment = info.name.replace("--ant-", "").split("-")[0];
      const groupKey = GLOBAL_SEGMENTS.has(segment)
        ? "全局 token"
        : `组件 ${segment}`;
      const list = map.get(groupKey) ?? [];
      list.push(info);
      map.set(groupKey, list);
    }
    let entries: [string, CssVarInfo[]][];
    if (keyword) {
      const lower = keyword.toLowerCase();
      entries = [...map.entries()].map(([key, list]) => [
        key,
        list.filter((info) => info.name.toLowerCase().includes(lower)),
      ]);
    } else {
      entries = [...map.entries()];
    }
    return entries
      .filter(([, list]) => list.length > 0)
      .sort((a, b) =>
        a[0] === "全局 token" ? -1 : b[0] === "全局 token" ? 1 : 0,
      )
      .sort((a, b) => b[1].length - a[1].length)
      .map(([key, list]) => ({ key, list }));
  }, [vars, keyword]);

  return (
    <PageLayout>
      {/* 说明区 */}
      <Card size="small" title="说明" className="mb-4">
        <Typography>
          <Typography.Paragraph>
            antd v6 默认开启 CSS 变量模式（cssVar），把主题 token 注入为 CSS
            变量： 全局 token{" "}
            <Typography.Text code>colorPrimary</Typography.Text> →{" "}
            <Typography.Text code>--ant-color-primary</Typography.Text>；组件
            token <Typography.Text code>Layout.Sider siderBg</Typography.Text> →{" "}
            <Typography.Text code>--ant-layout-sider-bg</Typography.Text>。
          </Typography.Paragraph>
          <Typography.Paragraph>
            用法：
            <Typography.Text code>
              style={"{{ background: 'var(--ant-color-primary)' }}"}
            </Typography.Text>
            ，或在自定义 CSS 中书写{" "}
            <Typography.Text code>
              background: var(--ant-color-primary)
            </Typography.Text>
            。变量随主题算法自动变化，切换暗色模式时无需改动样式代码。
          </Typography.Paragraph>
          <Typography.Paragraph type="warning">
            注意：组件级变量（如
            --ant-layout-sider-bg）只在该组件的类名作用域内定义，
            在组件外引用会得到空值；全局变量（--ant-color-*
            等）在任意位置均可引用。
            变量在组件首次渲染后才会注入，本页扫描结果来自应用已渲染过的组件。
          </Typography.Paragraph>
          <Typography.Paragraph>
            数据来源：优先加载静态快照{" "}
            <Typography.Text code>public/ant-css-vars.json</Typography.Text>
            （主题快照，适合文档速查；把「导出 JSON」下载的文件放回 public/
            即可启用），文件缺失时回退实时扫描（当前主题的实际注入值）。
          </Typography.Paragraph>
        </Typography>
      </Card>

      {/* 搜索与刷新 */}
      <Space className="mb-4" wrap>
        <Input.Search
          allowClear
          placeholder="按变量名过滤，如 sider、primary"
          style={{ width: 320 }}
          value={keyword}
          onChange={(e) => setKeyword(e.target.value)}
        />
        <Button icon={<ReloadOutlined />} onClick={scan}>
          实时扫描
        </Button>
        <Button
          icon={<DownloadOutlined />}
          disabled={!vars}
          onClick={downloadDump}
        >
          导出 JSON
        </Button>
        {vars && (
          <Typography.Text type="secondary">
            共 {vars.length} 个变量（来源：
            {source === "static"
              ? `静态快照 ${staticExportedAt ?? ""}`
              : "实时扫描"}
            ）
          </Typography.Text>
        )}
      </Space>

      {/* 分组列表 */}
      {!vars ? (
        <div className="flex justify-center py-16">
          <Spin />
        </div>
      ) : (
        <div className="flex flex-col gap-4">
          {groups.map((group) => (
            <Card
              key={group.key}
              size="small"
              title={`${group.key}（${group.list.length}）`}
            >
              <div className="flex flex-wrap gap-4">
                {group.list.map((info) => {
                  const display = info.value || info.rawValue;
                  return (
                    <div key={info.name} className="w-[220px]">
                      {/* 预览区：颜色值渲染色块；非颜色值（尺寸 / 字体 / 阴影等）
                          用中性底 + 文本展示，避免无效背景导致大片透明像 bug */}
                      {isColorLike(display) ? (
                        <div
                          className="h-8 rounded-md"
                          style={{
                            background: display,
                            border: `1px solid ${token.colorBorderSecondary}`,
                          }}
                        />
                      ) : (
                        <div
                          className="flex h-8 items-center overflow-hidden rounded-md px-2"
                          style={{
                            background: token.colorFillQuaternary,
                            border: `1px solid ${token.colorBorderSecondary}`,
                          }}
                        >
                          <Typography.Text
                            style={{ fontSize: 11 }}
                            ellipsis={{ tooltip: display || "（空）" }}
                          >
                            {display || "（空）"}
                          </Typography.Text>
                        </div>
                      )}
                      <Typography.Text
                        code
                        className="mt-1 block"
                        style={{ fontSize: 12, wordBreak: "break-all" }}
                      >
                        {info.name}
                      </Typography.Text>
                      <Typography.Text
                        type="secondary"
                        style={{ fontSize: 11, wordBreak: "break-all" }}
                      >
                        {display || "（空）"}
                      </Typography.Text>
                    </div>
                  );
                })}
              </div>
            </Card>
          ))}
        </div>
      )}
    </PageLayout>
  );
}
