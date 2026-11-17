"use client";

import type { ReactNode } from "react";
import { Button, Select } from "antd";
import { PlayCircleOutlined } from "@ant-design/icons";
import CodeEditor, { type EditorLanguage } from "@/components/CodeEditor";

// 语言展示名：新增语言时在此补一条
const LANGUAGE_LABELS: Record<EditorLanguage, string> = {
  python: "Python",
  java: "Java",
  cpp: "C++",
  c: "C",
  go: "Go",
  javascript: "JavaScript",
  typescript: "TypeScript",
  rust: "Rust",
  csharp: "C#",
};

/**
 * @description 编辑器面板：语言选择 + 代码编辑器 + 运行按钮。代码与运行态均由
 *              父级传入（完全受控），额外操作（如提交评测）通过 extra 插槽注入
 * @param value 受控代码内容
 * @param onChange 代码变化回调
 * @param language 当前作答语言
 * @param onLanguageChange 语言切换回调
 * @param languages 可选语言，默认全部
 * @param languageEditable 是否允许切换语言，false 时下拉禁用（仍展示当前语言）
 * @param running 是否正在运行
 * @param onRun 点击运行
 * @param extra 运行按钮右侧的额外操作，不传则不渲染
 */
export default function CodeEditorPanel({
  value,
  onChange,
  language,
  onLanguageChange,
  languages = ["python", "java", "cpp", "c", "go", "javascript", "typescript", "rust", "csharp"],
  languageEditable = true,
  running = false,
  onRun,
  extra,
}: {
  value: string;
  onChange: (value: string) => void;
  language: EditorLanguage;
  onLanguageChange: (language: EditorLanguage) => void;
  languages?: EditorLanguage[];
  languageEditable?: boolean;
  running?: boolean;
  onRun: () => void;
  extra?: ReactNode;
}) {
  return (
    <div className="flex h-full flex-col gap-2 bg-(--ant-color-bg-container) p-3">
      <div className="flex items-center justify-between">
        <Select
          size="small"
          style={{ width: 110 }}
          value={language}
          onChange={onLanguageChange}
          disabled={!languageEditable}
          options={languages.map((item) => ({
            value: item,
            label: LANGUAGE_LABELS[item],
          }))}
        />
        <div className="flex items-center gap-2">
          <Button
            size="small"
            icon={<PlayCircleOutlined />}
            loading={running}
            onClick={onRun}
          >
            运行
          </Button>
          {extra}
        </div>
      </div>
      <div className="min-h-0 flex-1">
        <CodeEditor
          value={value}
          onChange={onChange}
          language={language}
          height="100%"
        />
      </div>
    </div>
  );
}
