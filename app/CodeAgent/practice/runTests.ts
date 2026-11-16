import type { PreviewProblem } from "@/components/ProblemStatement";
import { getPyodide } from "@/lib/pyodide";

// 练习页默认代码模板：作答入口，占位 TODO 引导用户书写
export const DEFAULT_CODE =
  "def solution():\n    # TODO: 在这里编写你的解答\n    pass\n";

// 单个测试用例的运行结果：passed 为通过与否，error 为失败时的报错摘要
export type CaseResult = { passed: boolean; error: string | null };

// 一轮执行的完整报告：逐用例结果、控制台输出、代码级报错（如语法错误）
export type PyodideTestReport = {
  results: CaseResult[];
  console: string;
  compile_error: string | null;
};

// 逐用例执行脚本：先跑用户代码，再依次 exec 每条断言，结果以 JSON 返回
const RUN_HARNESS = `
import io, json, contextlib, traceback

_results = []
_console = io.StringIO()
_compile_error = None
_g = {}
with contextlib.redirect_stdout(_console), contextlib.redirect_stderr(_console):
    try:
        for _imp in _imports:
            exec(_imp, _g)
        exec(_user_code, _g)
        for _case in _cases:
            try:
                exec(_case, _g)
                _results.append({"passed": True, "error": None})
            except Exception as _exc:
                _results.append({
                    "passed": False,
                    "error": "".join(traceback.format_exception_only(type(_exc), _exc)).strip(),
                })
    except Exception as _exc:
        _compile_error = "".join(
            traceback.format_exception(type(_exc), _exc, _exc.__traceback__)
        ).strip()

json.dumps({"results": _results, "console": _console.getvalue(), "compile_error": _compile_error})
`;

/**
 * @description 在浏览器端用 Pyodide 跑当前代码：逐个执行测试用例并收集结果。
 *              「运行」与「提交评测」共用；stdout / stderr 回调由调用方传入，
 *              本模块不感知任何 UI 状态（无 React 依赖，便于复用与测试）
 * @param problem 提供测试用例与依赖导入的题目数据
 * @param code 待执行的作答代码
 * @param onStdout 控制台输出回调，用于实时更新 UI
 * @param onStderr 控制台错误输出回调，用于实时更新 UI
 */
export async function runInPyodide(
  problem: Pick<PreviewProblem, "test_cases" | "test_imports">,
  code: string,
  onStdout: (line: string) => void,
  onStderr: (line: string) => void,
): Promise<PyodideTestReport> {
  /** 初始化 Pyodide 环境，设置 stdout / stderr 回调，加载用户代码 */
  const pyodide = await getPyodide();
  /** 设置 Pyodide 环境的 stdout 回调 */
  pyodide.setStdout({ batched: onStdout });
  /** 设置 Pyodide 环境的 stderr 回调 */
  pyodide.setStderr({ batched: onStderr });

  // 把用户代码与用例注入全局变量，交给 Python 侧脚本逐条执行
  pyodide.globals.set("_user_code", code);
  pyodide.globals.set("_cases", problem.test_cases ?? []);
  pyodide.globals.set("_imports", problem.test_imports ?? []);
  const raw = await pyodide.runPythonAsync(RUN_HARNESS);
  return JSON.parse(String(raw)) as PyodideTestReport;
}
