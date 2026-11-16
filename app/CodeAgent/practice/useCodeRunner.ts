"use client";

import { useCallback, useRef, useState } from "react";
import type { PreviewProblem } from "@/components/ProblemStatement";
import {
  runInPyodide,
  type CaseResult,
  type PyodideTestReport,
} from "./runTests";

/**
 * @description 浏览器端执行代码的运行器 hook：管理运行态、控制台输出与逐用例结果，
 *              供工作台的编辑器面板与结果面板共用；不感知标签页 / 布局等 UI 状态
 * @param problem 提供测试用例与依赖导入的题目数据
 */
export function useCodeRunner(
  problem: Pick<PreviewProblem, "test_cases" | "test_imports">,
) {
  const [running, setRunning] = useState(false);
  const [output, setOutput] = useState<string | null>(null);
  const [caseResults, setCaseResults] = useState<CaseResult[] | null>(null);
  // 同步保存输出，避免连续 stdout 回调读到闭包里的旧值
  const outputRef = useRef<string | null>(null);

  /** @description 覆写输出内容（同步 ref 与 state） */
  const writeOutput = useCallback((text: string | null) => {
    outputRef.current = text;
    setOutput(text);
  }, []);

  /** @description 追加一行输出（同步 ref 与 state） */
  const appendOutput = useCallback(
    (text: string) => {
      writeOutput((outputRef.current ?? "") + text + "\n");
    },
    [writeOutput],
  );

  /**
   * @description 执行当前代码并返回完整报告；执行失败返回 null（错误已写入输出）
   * @param code 待执行的作答代码
   */
  const run = useCallback(
    async (code: string): Promise<PyodideTestReport | null> => {
      setRunning(true);
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
        return report;
      } catch (error) {
        writeOutput(`运行报错:\n${(error as Error).message ?? String(error)}`);
        return null;
      } finally {
        setRunning(false);
      }
    },
    [appendOutput, problem, writeOutput],
  );

  return {
    /** @description 运行状态：是否正在执行代码 */
    running,
    /** @description 控制台输出：当前执行代码的输出内容 */
    output,
    /** @description 逐用例结果：当前执行代码的测试用例结果 */
    caseResults,
    /** @description 执行当前代码并返回完整报告；执行失败返回 null（错误已写入输出） */
    run,
  };
}
