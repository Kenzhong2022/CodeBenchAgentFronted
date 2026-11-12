import { NextResponse } from "next/server";
import { getSupabase } from "@/lib/supabase";

// 提交记录独立 API：account_id 逻辑关联 accounts.id（不建物理外键）；
// id / created_at 由数据库维护，不接受写入

// 沙箱评测结果状态：AC(通过) / WA(答案错误) / CE(编译错误) / RE(运行错误) / TLE(超时)
const STATUS_VALUES = new Set(["AC", "WA", "CE", "RE", "TLE"]);

// 必填字段：与表结构 NOT NULL 约束一致
const REQUIRED_FIELDS = ["problem_id", "account_id", "status"] as const;

// 校验并转换请求体，只保留白名单列；返回首个校验错误信息
function sanitize(body: unknown): { row?: Record<string, unknown>; error?: string } {
  if (!body || typeof body !== "object") return { error: "请求数据不合法" };
  const source = body as Record<string, unknown>;
  const row: Record<string, unknown> = {};

  if (source.problem_id !== undefined) {
    const problemId = Number(source.problem_id);
    if (!Number.isInteger(problemId) || problemId <= 0) {
      return { error: "problem_id 必须是正整数" };
    }
    row.problem_id = problemId;
  }
  if (source.account_id !== undefined) {
    // accounts.id 是 UUID 字符串，与 problem_id（自增整数）不同，只做非空校验
    const accountId = String(source.account_id).trim();
    if (!accountId) {
      return { error: "account_id 不能为空" };
    }
    row.account_id = accountId;
  }
  if (source.status !== undefined) {
    const status = String(source.status).toUpperCase();
    if (!STATUS_VALUES.has(status)) {
      return { error: "状态必须为 AC / WA / CE / RE / TLE" };
    }
    row.status = status;
  }
  if (source.pass !== undefined) {
    // 浏览器端测试集跑完后的总体通过结果（布尔）
    if (typeof source.pass !== "boolean") {
      return { error: "pass 必须是布尔值" };
    }
    row.pass = source.pass;
  }
  if (source.error_reason !== undefined) {
    // 未通过时的失败原因：编译错误或首个失败用例的报错
    row.error_reason = String(source.error_reason);
  }
  if (source.agent_report !== undefined) {
    row.agent_report = String(source.agent_report);
  }
  return { row };
}

export async function GET() {
  const supabase = getSupabase();
  const { data, error } = await supabase
    .from("submissions")
    .select("*")
    .order("created_at", { ascending: true });

  if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  return NextResponse.json(data);
}

export async function POST(req: Request) {
  const { row, error } = sanitize(await req.json().catch(() => null));
  if (error || !row) {
    return NextResponse.json({ error: error ?? "请求数据不合法" }, { status: 400 });
  }
  const missing = REQUIRED_FIELDS.filter((field) => !(field in row));
  if (missing.length > 0) {
    return NextResponse.json({ error: `缺少必填字段：${missing.join("、")}` }, { status: 400 });
  }

  const { data, error: dbError } = await getSupabase()
    .from("submissions")
    .insert(row)
    .select()
    .single();
  if (dbError) return NextResponse.json({ error: dbError.message }, { status: 500 });
  return NextResponse.json(data);
}

export async function PATCH(req: Request) {
  const id = new URL(req.url).searchParams.get("id");
  if (!id) return NextResponse.json({ error: "缺少 id" }, { status: 400 });

  const { row, error } = sanitize(await req.json().catch(() => null));
  if (error || !row) {
    return NextResponse.json({ error: error ?? "请求数据不合法" }, { status: 400 });
  }
  if (Object.keys(row).length === 0) {
    return NextResponse.json({ error: "没有可更新的字段" }, { status: 400 });
  }

  const { data, error: dbError } = await getSupabase()
    .from("submissions")
    .update(row)
    .eq("id", id)
    .select()
    .single();
  if (dbError) return NextResponse.json({ error: dbError.message }, { status: 500 });
  return NextResponse.json(data);
}

export async function DELETE(req: Request) {
  const id = new URL(req.url).searchParams.get("id");
  if (!id) return NextResponse.json({ error: "缺少 id" }, { status: 400 });

  const { error } = await getSupabase().from("submissions").delete().eq("id", id);
  if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  return NextResponse.json({ ok: true });
}
