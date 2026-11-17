"use client";

import { useCallback, useState } from "react";
import type { PreviewProblem } from "@/components/ProblemStatement";
import { runOnServer, type CaseResult, type TestReport } from "./runTests";

/**
 * @description 代码运行器 hook：把代码提交到服务端沙箱执行，管理运行态、
 *              控制台输出与逐用例结果，供工作台的编辑器面板与结果面板共用；
 *              不感知标签页 / 布局等 UI 状态
 * @param problem 提供测试用例与依赖导入的题目数据
 */
export function useCodeRunner(
  problem: Pick<PreviewProblem, "test_cases" | "test_imports">,
) {
  const [running, setRunning] = useState(false);
  const [output, setOutput] = useState<string | null>(null);
  const [caseResults, setCaseResults] = useState<CaseResult[] | null>(null);

  /**
   * @description 执行当前代码并返回完整报告；执行失败返回 null（错误已写入输出）
   * @param code 待执行的作答代码
   */
  const run = useCallback(
    async (code: string): Promise<TestReport | null> => {
      setRunning(true);
      setCaseResults(null);
      setOutput("正在提交到服务端沙箱执行…");
      try {
        const report = await runOnServer(problem, code);
        if (report.compile_error) {
          setOutput(`运行报错:\n${report.compile_error}`);
        } else {
          setCaseResults(report.results);
          setOutput(report.console || "(无输出)");
        }
        return report;
      } catch (error) {
        setOutput(`运行报错:\n${(error as Error).message ?? String(error)}`);
        return null;
      } finally {
        setRunning(false);
      }
    },
    [problem],
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
