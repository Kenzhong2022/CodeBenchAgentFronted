import type { PreviewProblem } from "@/components/ProblemStatement";

// 练习页默认代码模板：作答入口，占位 TODO 引导用户书写
export const DEFAULT_CODE =
  "def solution():\n    # TODO: 在这里编写你的解答\n    pass\n";

// 单个测试用例的运行结果：passed 为通过与否，error 为失败时的报错摘要
export type CaseResult = { passed: boolean; error: string | null };

// 一轮执行的完整报告：逐用例结果、控制台输出、代码级报错（如语法错误）
export type TestReport = {
  results: CaseResult[];
  console: string;
  compile_error: string | null;
};

/**
 * @description 把代码提交到服务端沙箱（FastAPI /api/execute）执行测试用例并收集结果。
 *              「运行」与「提交评测」共用；执行与用例判定均在服务端完成，
 *              前端不再运行任何代码（已移除 Pyodide）
 * @param problem 提供测试用例与依赖导入的题目数据
 * @param code 待执行的作答代码
 * @returns 服务端返回的评测报告；服务端错误（后端未启动 / 沙箱故障）时抛出异常
 */
export async function runOnServer(
  problem: Pick<PreviewProblem, "test_cases" | "test_imports">,
  code: string,
): Promise<TestReport> {
  const res = await fetch("/api/execute", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      code,
      test_cases: problem.test_cases ?? [],
      test_imports: problem.test_imports ?? [],
    }),
  });
  const body = await res.json().catch(() => null);
  if (!res.ok) {
    const msg =
      (body as { error?: string; detail?: string } | null)?.error ??
      (body as { detail?: string } | null)?.detail ??
      `执行服务返回 ${res.status}`;
    throw new Error(String(msg));
  }
  const data = body as {
    results?: CaseResult[];
    console?: string;
    compile_error?: string | null;
  };
  return {
    results: data.results ?? [],
    console: data.console ?? "",
    compile_error: data.compile_error ?? null,
  };
}
