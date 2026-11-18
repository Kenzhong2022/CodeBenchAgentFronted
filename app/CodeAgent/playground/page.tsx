"use client";

import { useState } from "react";
import { App, Splitter, Tag, Typography } from "antd";
import PageLayout from "@/components/PageLayout";
import PageHeader from "@/components/PageHeader";
import type { EditorLanguage } from "@/components/CodeEditor";
import CodeEditorPanel from "@/app/CodeAgent/practice/CodeEditorPanel";

/**
 * 快速执行（Playground）：选择语言 → 写任意代码 → 提交服务端沙箱执行。
 * 不关联题目、不跑测试用例，仅作纯运行（stdin 可选），评测请走练习页
 */

// 语言 -> 后端编译器 ID：与 /api/execute 的 ALLOWED_COMPILER_IDS 白名单对应
const COMPILER_ID_BY_LANGUAGE: Record<EditorLanguage, string> = {
  python: "python-3.14",
  java: "openjdk-25",
  cpp: "g++-15",
  c: "gcc-15",
  go: "go-1.26",
  javascript: "nodejs-24",
  typescript: "typescript-deno",
  rust: "rust-1.93",
  csharp: "dotnet-csharp-10",
};

// 各语言的默认代码模板：Hello World + 简单输入回显
const DEFAULT_SNIPPETS: Record<EditorLanguage, string> = {
  python: "print('Hello')\nname = input()\nprint(f'你好, {name}')\n",
  java: "public class Main {\n    public static void main(String[] args) {\n        System.out.println(\"Hello\");\n    }\n}\n",
  cpp: "#include <iostream>\nusing namespace std;\n\nint main() {\n    cout << \"Hello\" << endl;\n    return 0;\n}\n",
  c: "#include <stdio.h>\n\nint main(void) {\n    printf(\"Hello\\n\");\n    return 0;\n}\n",
  go: "package main\n\nimport \"fmt\"\n\nfunc main() {\n    fmt.Println(\"Hello\")\n}\n",
  javascript: "console.log('Hello');\n",
  typescript: "const msg: string = 'Hello';\nconsole.log(msg);\n",
  rust: "fn main() {\n    println!(\"Hello\");\n}\n",
  csharp: "using System;\n\nclass Program {\n    static void Main() {\n        Console.WriteLine(\"Hello\");\n    }\n}\n",
};

// 单次执行的结果展示数据
type RunResult = {
  output: string;
  exit_code: number;
  duration_ms: number;
  timed_out: boolean;
  truncated: boolean;
};

export default function PlaygroundPage() {
  return (
    <PageLayout
      header={
        <PageHeader
          title="快速执行"
          description="选择语言编写任意代码，提交到服务端沙箱执行（不关联题目、不保存提交记录）"
        />
      }
      contentClassName="h-[calc(100vh-160px)]"
    >
      <PlaygroundSection />
    </PageLayout>
  );
}

function PlaygroundSection() {
  const { message } = App.useApp();
  const [language, setLanguage] = useState<EditorLanguage>("python");
  const [code, setCode] = useState(DEFAULT_SNIPPETS.python);
  const [stdin, setStdin] = useState("");
  const [running, setRunning] = useState(false);
  const [result, setResult] = useState<RunResult | null>(null);
  const [error, setError] = useState<string | null>(null);

  /**
   * @description 切换语言：仅当代码仍是上一个语言的默认模板（或为空）时替换为新模板，
   *              避免覆盖用户已编写的代码
   */
  function handleLanguageChange(next: EditorLanguage) {
    if (code === DEFAULT_SNIPPETS[language] || !code.trim()) {
      setCode(DEFAULT_SNIPPETS[next]);
    }
    setLanguage(next);
    setResult(null);
    setError(null);
  }

  /** @description 提交到服务端沙箱纯运行（无测试用例） */
  async function handleRun() {
    if (running) return;
    if (!code.trim()) {
      message.warning("代码为空，请先编写代码");
      return;
    }
    setRunning(true);
    setError(null);
    try {
      const res = await fetch("/api/execute", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          code,
          stdin,
          compiler_id: COMPILER_ID_BY_LANGUAGE[language],
        }),
      });
      const body = await res.json().catch(() => null);
      if (!res.ok) {
        throw new Error(
          (body as { error?: string; detail?: string } | null)?.error ??
            (body as { detail?: string } | null)?.detail ??
            `执行服务返回 ${res.status}`,
        );
      }
      const data = body as {
        output?: string;
        exit_code?: number;
        duration_ms?: number;
        timed_out?: boolean;
        truncated?: boolean;
      };
      setResult({
        output: data.output ?? "",
        exit_code: data.exit_code ?? -1,
        duration_ms: data.duration_ms ?? 0,
        timed_out: data.timed_out ?? false,
        truncated: data.truncated ?? false,
      });
    } catch (e) {
      setError((e as Error).message);
      setResult(null);
    } finally {
      setRunning(false);
    }
  }

  return (
    <div className="h-full">
      <Splitter orientation="vertical">
        {/* 上：语言选择 + 代码编辑器 */}
        <Splitter.Panel defaultSize="62%" min="30%" max="80%">
          <CodeEditorPanel
            value={code}
            onChange={setCode}
            language={language}
            onLanguageChange={handleLanguageChange}
            running={running}
            onRun={handleRun}
          />
        </Splitter.Panel>

        {/* 下：左标准输入 | 右执行结果 */}
        <Splitter.Panel min="20%" max="70%">
          <Splitter>
            <Splitter.Panel defaultSize="38%" min="20%" max="60%">
              <div className="flex h-full flex-col gap-2 bg-(--ant-color-bg-container) p-3">
                <Typography.Text type="secondary" className="text-[13px]">
                  标准输入（stdin，可选）
                </Typography.Text>
                <textarea
                  value={stdin}
                  onChange={(e) => setStdin(e.target.value)}
                  placeholder="多行输入，运行时作为程序的标准输入传入，如 input() 读取的内容"
                  spellCheck={false}
                  className="h-full w-full flex-1 resize-none rounded-lg border border-(--ant-color-border-secondary) bg-(--ant-color-fill-tertiary) p-3 font-mono text-[13px] leading-6 text-(--ant-color-text) outline-none focus:border-(--ant-color-primary)"
                />
              </div>
            </Splitter.Panel>
            <Splitter.Panel min="40%">
              <div className="h-full overflow-y-auto bg-(--ant-color-bg-container) p-3">
                {/* 执行元信息：退出码 / 耗时 / 超时 / 截断 */}
                {result && (
                  <div className="mb-2 flex flex-wrap items-center gap-2">
                    <Tag color={result.exit_code === 0 ? "success" : "error"}>
                      退出码 {result.exit_code}
                    </Tag>
                    <Tag>{(result.duration_ms / 1000).toFixed(2)}s</Tag>
                    {result.timed_out && <Tag color="error">超时终止</Tag>}
                    {result.truncated && <Tag color="warning">输出已截断</Tag>}
                  </div>
                )}
                {error ? (
                  <pre className="overflow-x-auto whitespace-pre-wrap rounded-lg border border-(--ant-color-error-border) bg-(--ant-color-error-bg) p-3 font-mono text-[13px] leading-6 text-(--ant-color-error-text)">
                    {error}
                  </pre>
                ) : result ? (
                  <pre className="overflow-x-auto whitespace-pre-wrap rounded-lg border border-(--ant-color-border-secondary) bg-(--ant-color-fill-tertiary) p-3 font-mono text-[13px] leading-6 text-(--ant-color-text)">
                    {result.output || "(无输出)"}
                  </pre>
                ) : (
                  <div className="py-8 text-center text-xs text-(--ant-color-text-description)">
                    点击「运行」提交到服务端沙箱执行，这里展示标准输出与错误
                  </div>
                )}
              </div>
            </Splitter.Panel>
          </Splitter>
        </Splitter.Panel>
      </Splitter>
    </div>
  );
}
