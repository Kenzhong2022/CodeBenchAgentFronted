"use client";

import { useRef, useState } from "react";
import { App, Button, Select, Space, Splitter, Tabs, Tag, Tooltip } from "antd";
import {
  CheckSquareOutlined,
  CodeOutlined,
  PlayCircleOutlined,
  ThunderboltOutlined,
} from "@ant-design/icons";
import type { PreviewProblem } from "@/components/ProblemStatement";
import ProblemStatement from "@/components/ProblemStatement";
import CodeEditor, { type EditorLanguage } from "@/components/CodeEditor";
import { getSessionUser } from "@/lib/session";
import { DEFAULT_CODE, runInPyodide, type CaseResult } from "./runTests";

/**
 * @description 练习页工作台：LeetCode 式左右 Splitter（题面 | 工作台），
 *              右侧内部上下 Splitter（编辑器 | 用例面板）。
 *              拆成独立组件是因为 App.useApp() 必须在 <AntApp>（PageLayout 内部）
 *              的子组件中调用；题目数据来自父组件（page.tsx）拉取后传入
 */
export default function PracticeWorkbench({
  problem,
}: {
  problem: PreviewProblem;
}) {
  const { message } = App.useApp();
  // 作答代码：切换题目时重置为默认模板
  const [code, setCode] = useState(DEFAULT_CODE);
  // 浏览器端运行状态与输出（Pyodide）；ref 同步保存输出以避免闭包读到旧值
  const [isRunning, setIsRunning] = useState(false);
  const [output, setOutput] = useState<string | null>(null);
  const outputRef = useRef<string | null>(null);
  // 逐用例结果：与 problem.test_cases 下标对应；null 表示本轮没有可执行结果（如代码本身报错）
  const [caseResults, setCaseResults] = useState<CaseResult[] | null>(null);
  // 右下结果面板：测试用例 / 测试结果 两个 Tab；运行时自动切到「测试结果」
  const [panelTab, setPanelTab] = useState("cases");
  // 作答语言（参考 LeetCode：编辑器上方下拉切换）
  const [language, setLanguage] = useState<EditorLanguage>("python");

  /**
   * @description 覆写输出内容（同步 ref 与 state）
   */
  function writeOutput(text: string | null) {
    outputRef.current = text;
    setOutput(text);
  }

  /**
   * @description 追加一行输出（同步 ref 与 state）
   */
  function appendOutput(text: string) {
    writeOutput((outputRef.current ?? "") + text + "\n");
  }

  /**
   * @description 运行：执行测试集并在结果面板展示，不落库
   */
  async function handleRun() {
    if (isRunning) return;
    setIsRunning(true);
    setPanelTab("result");
    setCaseResults(null);
    writeOutput("正在加载 Python 环境并执行…");
    try {
      const report = await runInPyodide(
        problem,
        code,
        appendOutput,
        appendOutput,
      );
      if (report.compile_error) {
        writeOutput(`运行报错:\n${report.compile_error}`);
      } else {
        setCaseResults(report.results);
        writeOutput(report.console || "(无输出)");
      }
    } catch (error) {
      writeOutput(`运行报错:\n${(error as Error).message ?? String(error)}`);
    } finally {
      setIsRunning(false);
    }
  }

  /**
   * @description 提交评测：与「运行」一致地执行测试集，跑完后把结果存入 submissions 表——
   *              pass（布尔，全部用例通过才为 true）、error_reason（编译错误或首个失败用例报错）、
   *              status 由 pass 推导（AC / WA）；需已登录（account_id 取自本地会话）
   */
  async function handleSubmit() {
    if (isRunning) return;
    if (!code.trim()) {
      message.warning("代码为空，请先编写解答");
      return;
    }
    const user = getSessionUser();
    if (!user) {
      message.warning("请先登录后再提交评测");
      return;
    }
    setIsRunning(true);
    setPanelTab("result");
    setCaseResults(null);
    writeOutput("正在加载 Python 环境并执行测试集…");
    try {
      const report = await runInPyodide(
        problem,
        code,
        appendOutput,
        appendOutput,
      );
      if (report.compile_error) {
        writeOutput(`运行报错:\n${report.compile_error}`);
      } else {
        setCaseResults(report.results);
        writeOutput(report.console || "(无输出)");
      }

      // 聚合总体结果：全部用例通过且无编译错误才算通过；失败原因取编译错误或首个失败用例
      const pass =
        !report.compile_error &&
        report.results.length > 0 &&
        report.results.every((r) => r.passed);
      const firstFail = report.results.find((r) => !r.passed);
      const errorReason = report.compile_error ?? firstFail?.error ?? null;

      const res = await fetch("/api/submissions", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          problem_id: problem.id,
          account_id: user.id,
          status: pass ? "AC" : "WA",
          pass,
          error_reason: errorReason,
        }),
      });
      const body = await res.json().catch(() => null);
      if (!res.ok) {
        throw new Error(
          (body as { error?: string } | null)?.error ?? "提交记录保存失败",
        );
      }
      if (pass) {
        message.success(
          `全部通过（${report.results.length} 个用例），提交记录已保存`,
        );
      } else {
        message.warning("未全部通过，提交记录已保存");
      }
    } catch (error) {
      writeOutput(`运行报错:\n${(error as Error).message ?? String(error)}`);
      message.error((error as Error).message);
    } finally {
      setIsRunning(false);
    }
  }

  // LeetCode 式工作台布局：外层左右 Splitter（题面 | 工作台），右侧内部上下 Splitter（编辑器 | 用例面板）
  return (
    <div className="h-full">
      <Splitter>
        {/* 左侧：题面，独立滚动，可拖拽调宽 */}
        <Splitter.Panel defaultSize="42%" min="28%" max="60%">
          <div className="h-full overflow-y-auto pr-3 bg-(--ant-color-bg-container)">
            <ProblemStatement problem={problem} />
          </div>
        </Splitter.Panel>

        {/* 右侧：上下 Splitter（编辑器 | 测试用例/结果面板） */}
        <Splitter.Panel min="40%" max="72%">
          <Splitter orientation="vertical">
            {/* 上：语言栏 + 代码编辑器 */}
            <Splitter.Panel defaultSize="58%" min="30%" max="80%">
              <div className="flex h-full flex-col gap-2 bg-(--ant-color-bg-container) p-3">
                <div className="flex items-center justify-between">
                  <Select
                    size="small"
                    style={{ width: 110 }}
                    value={language}
                    onChange={setLanguage}
                    options={[
                      { value: "python", label: "Python" },
                      { value: "java", label: "Java" },
                    ]}
                  />
                  <div className="flex items-center gap-2">
                    <Button
                      size="small"
                      icon={<PlayCircleOutlined />}
                      loading={isRunning}
                      onClick={handleRun}
                    >
                      运行
                    </Button>
                    <Button
                      size="small"
                      type="primary"
                      icon={<ThunderboltOutlined />}
                      onClick={handleSubmit}
                    >
                      提交评测
                    </Button>
                  </div>
                </div>
                <div className="min-h-0 flex-1">
                  <CodeEditor
                    value={code}
                    onChange={setCode}
                    language={language}
                    height="100%"
                  />
                </div>
              </div>
            </Splitter.Panel>

            {/* 下：测试用例 / 测试结果 双 Tab 面板 */}
            <Splitter.Panel min="20%" max="70%">
              <div className="h-full overflow-y-auto bg-(--ant-color-bg-container) p-3">
                <Tabs
                  activeKey={panelTab}
                  onChange={setPanelTab}
                  size="small"
                  items={[
                    {
                      key: "cases",
                      label: (
                        <span>
                          <CheckSquareOutlined /> 测试用例
                        </span>
                      ),
                      children: (
                        <Tabs
                          size="small"
                          items={(problem.test_cases ?? []).map(
                            (testCase, index) => ({
                              key: String(index),
                              label: `Case ${index + 1}`,
                              children: (
                                <pre className="overflow-x-auto rounded-lg bg-(--ant-color-fill-tertiary) p-3 font-mono text-[13px] leading-6 text-(--ant-color-text)">
                                  {String(testCase)}
                                </pre>
                              ),
                            }),
                          )}
                        />
                      ),
                    },
                    {
                      key: "result",
                      label: (
                        <span>
                          <CodeOutlined /> 测试结果
                        </span>
                      ),
                      children:
                        caseResults !== null ? (
                          <div className="flex flex-col gap-2">
                            {/* 逐用例结果：与「测试用例」Tab 中 Case N 一一对应 */}
                            {caseResults.map((result, index) => (
                              <div
                                key={index}
                                className="rounded-lg border border-(--ant-color-border-secondary) p-2"
                              >
                                <div className="flex items-center gap-2 text-[13px]">
                                  <Tag
                                    color={result.passed ? "success" : "error"}
                                    style={{ marginInlineEnd: 0 }}
                                  >
                                    {result.passed ? "通过" : "失败"}
                                  </Tag>
                                  <span className="font-medium">
                                    Case {index + 1}
                                  </span>
                                </div>
                                {!result.passed && result.error && (
                                  <pre className="mt-2 overflow-x-auto whitespace-pre-wrap rounded bg-(--ant-color-fill-tertiary) p-2 font-mono text-[12px] leading-5 text-(--ant-color-text)">
                                    {result.error}
                                  </pre>
                                )}
                              </div>
                            ))}
                            <div className="mt-1 text-xs text-(--ant-color-text-description)">
                              控制台输出
                            </div>
                            <pre className="mt-2 overflow-x-auto whitespace-pre-wrap rounded bg-(--ant-color-fill-tertiary) p-2 font-mono text-[12px] leading-5 text-(--ant-color-text)">
                              {output ?? "(无输出)"}
                            </pre>
                          </div>
                        ) : output !== null ? (
                          <pre className="max-h-56 overflow-auto rounded-lg border border-(--ant-color-border-secondary) bg-(--ant-color-bg-layout) p-3 font-mono text-[13px] leading-6 text-(--ant-color-text)">
                            {output}
                          </pre>
                        ) : (
                          <div className="py-8 text-center text-xs text-(--ant-color-text-description)">
                            点击「运行」逐个执行测试用例，这里展示每个用例的通过情况与输出
                          </div>
                        ),
                    },
                  ]}
                />
              </div>
            </Splitter.Panel>
          </Splitter>
        </Splitter.Panel>
      </Splitter>
    </div>
  );
}
