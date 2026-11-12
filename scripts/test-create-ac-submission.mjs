// 测试脚本：创建一条指定状态的 submission 记录，并回读校验
// 运行：node scripts/test-create-ac-submission.mjs [status] [baseUrl]
//   status 默认 AC（通过）；不通过示例：node scripts/test-create-ac-submission.mjs WA

const STATUS = process.argv[2] ?? "AC";
const BASE_URL = process.argv[3] ?? "http://localhost:3000";

async function getJson(path) {
  const res = await fetch(`${BASE_URL}${path}`);
  const body = await res.json().catch(() => null);
  if (!res.ok) {
    throw new Error(`GET ${path} 失败：${res.status} ${body?.error ?? ""}`);
  }
  return body;
}

async function main() {
  console.log(`目标服务：${BASE_URL}\n`);

  // 1. 准备合法外键：取第一个题目与第一个账号（problem_id / account_id 均为逻辑关联，必须用真实存在的 id）
  const problems = await getJson("/api/problems");
  const accounts = await getJson("/api/crud/accounts");
  if (!Array.isArray(problems) || problems.length === 0) {
    throw new Error("problems 表为空，请先在题库中添加题目");
  }
  if (!Array.isArray(accounts) || accounts.length === 0) {
    throw new Error("accounts 表为空，请先注册账号");
  }
  const problem = problems[0];
  const account = accounts[0];
  console.log(`题目：#${problem.id} ${problem.title ?? ""}`);
  console.log(`账号：#${account.id} ${account.name ?? ""}\n`);

  // 2. 创建指定状态提交：user_code 字段已删除，必填项为 problem_id / account_id / status
  const res = await fetch(`${BASE_URL}/api/submissions`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      problem_id: problem.id,
      account_id: account.id,
      status: STATUS,
      agent_report: `测试脚本自动生成的 ${STATUS} 记录`,
    }),
  });
  const created = await res.json().catch(() => null);
  if (!res.ok) {
    throw new Error(`POST /api/submissions 失败：${res.status} ${created?.error ?? ""}`);
  }
  console.log("创建成功：", created);

  // 3. 回读校验：新记录存在、状态与请求一致、problem_id / account_id 与请求一致
  const rows = await getJson("/api/submissions");
  const found = rows.find((r) => String(r.id) === String(created.id));
  if (!found) throw new Error(`校验失败：回读中未找到 id=${created.id}`);
  if (found.status !== STATUS) {
    throw new Error(`校验失败：status=${found.status}，期望 ${STATUS}`);
  }
  if (String(found.problem_id) !== String(problem.id)) {
    throw new Error(`校验失败：problem_id=${found.problem_id}，期望 ${problem.id}`);
  }
  if (String(found.account_id) !== String(account.id)) {
    throw new Error(`校验失败：account_id=${found.account_id}，期望 ${account.id}`);
  }
  console.log(
    `✅ 校验通过：id=${found.id} status=${found.status} problem_id=${found.problem_id} account_id=${found.account_id} created_at=${found.created_at}`
  );
}

main().catch((err) => {
  console.error("❌ [FAIL]", err.message);
  process.exit(1);
});
