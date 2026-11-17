"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import dayjs from "dayjs";
import { Tag } from "antd";
import CrudManager, { deriveFilterFields } from "@/components/CrudManager";
import type { CrudField, FilterValues } from "@/components/CrudManager";
import {
  fetchRows,
  matchRow,
  persistTable,
  reconcileRows,
  type TableRow,
} from "@/lib/tableClient";

type Row = TableRow;

// 题目摘要：仅 id 与标题，用于下拉选项和单元格展示
type ProblemBrief = { id: string | number; title: string };

// 账号摘要：仅 id 与名称，用于提交账号下拉选项和单元格展示
type AccountBrief = { id: string | number; name: string };

// 评测状态：沙箱返回的枚举值及展示颜色
const STATUS_META: Record<string, { color: string; label: string }> = {
  AC: { color: "green", label: "通过" },
  WA: { color: "red", label: "答案错误" },
  CE: { color: "orange", label: "编译错误" },
  RE: { color: "volcano", label: "运行错误" },
  TLE: { color: "purple", label: "超时" },
};

const STATUS_OPTIONS = Object.entries(STATUS_META).map(([value, meta]) => ({
  value,
  label: `${value}（${meta.label}）`,
}));

// 提交管理：submissions 表的增删改查；题目 / 账号字段关联 problems、accounts 表做下拉选择与展示。
// 筛选项不再单独配置，由 fields 自动推导（status/题目/账号→下拉精确匹配，提交时间→日期区间）
export default function SubmissionManager() {
  const [rows, setRows] = useState<Row[]>([]);
  const [problems, setProblems] = useState<ProblemBrief[]>([]);
  const [accounts, setAccounts] = useState<AccountBrief[]>([]);
  const [filters, setFilters] = useState<FilterValues>({});
  // 组件卸载后不再回写拉取结果
  const cancelledRef = useRef(false);

  useEffect(() => {
    cancelledRef.current = false;
    let cancelled = false;
    (async () => {
      try {
        const [submissions, problems, accounts] = await Promise.all([
          fetchRows("submissions"),
          fetchRows("problems"),
          fetchRows("accounts"),
        ]);
        if (cancelled) return;
        setRows(submissions);
        setProblems(
          problems.map((p) => ({ id: p.id, title: String(p.title ?? "") }))
        );
        setAccounts(
          accounts.map((a) => ({ id: a.id, name: String(a.name ?? "") }))
        );
      } catch (err) {
        console.error("[submissions] 加载失败", err);
      }
    })();
    return () => {
      cancelled = true;
      cancelledRef.current = true;
    };
  }, []);

  const problemTitleById = useMemo(() => {
    const map = new Map<string, string>();
    for (const p of problems) map.set(String(p.id), p.title);
    return map;
  }, [problems]);

  const accountNameById = useMemo(() => {
    const map = new Map<string, string>();
    for (const a of accounts) map.set(String(a.id), a.name);
    return map;
  }, [accounts]);

  // 题目 / 账号下拉的选项跟对应表数据联动，新增提交时只能选择已有题目与账号
  const fields = useMemo<CrudField[]>(() => {
    const problemOptions = problems.map((p) => ({
      label: `#${p.id} ${p.title}`,
      value: p.id,
    }));
    const accountOptions = accounts.map((a) => ({
      label: `#${a.id} ${a.name}`,
      value: a.id,
    }));
    return [
      {
        name: "problem_id",
        label: "题目",
        type: "select",
        options: problemOptions,
        render: (value) => {
          const title = problemTitleById.get(String(value));
          const idText = String(value);
          return title ? `#${idText} ${title}` : `#${idText}`;
        },
      },
      {
        name: "account_id",
        label: "提交账号",
        type: "select",
        options: accountOptions,
        // 账号会越来越多，筛选不用下拉全量拉取，改为按账号名的关键字搜索（匹配行上的 accountName 计算字段）
        filter: { name: "accountName", label: "提交账号", placeholder: "按账号名搜索" },
        render: (value) => {
          const name = accountNameById.get(String(value));
          const idText = String(value);
          return name ? `#${idText} ${name}` : `#${idText}`;
        },
      },
      {
        name: "status",
        label: "评测状态",
        type: "select",
        options: STATUS_OPTIONS,
        render: (value) => {
          const meta = STATUS_META[String(value)];
          return meta ? (
            <Tag color={meta.color}>
              {String(value)} · {meta.label}
            </Tag>
          ) : (
            <Tag>{String(value)}</Tag>
          );
        },
      },
      { name: "agent_report", label: "Agent 分析报告", type: "textarea", required: false },
      {
        name: "created_at",
        label: "提交时间",
        type: "date",
        editable: false,
        render: (value) => dayjs(String(value)).format("YYYY-MM-DD HH:mm"),
      },
    ];
  }, [problems, problemTitleById, accounts, accountNameById]);

  // 筛选字段由 fields 自动推导：status/题目下拉精确匹配，提交时间日期区间，账号按名称关键字搜索
  const filterFields = useMemo(() => deriveFilterFields(fields), [fields]);

  // accountName 是筛选用计算字段：按账号名关键字包含匹配
  const visibleRows = useMemo(
    () =>
      rows
        .map((row) => ({
          ...row,
          accountName: accountNameById.get(String(row.account_id)) ?? "",
        }))
        .filter((row) => matchRow(row, filters, filterFields)),
    [rows, filters, filterFields, accountNameById]
  );

  // 先更新界面，再把差异写回数据库；无论成败都重新拉取，保证拿到服务端规范后的数据（自增 id）
  function persist(previous: Row[], next: Row[]) {
    persistTable("submissions", previous, next)
      .catch((err) => console.error("[submissions] 保存失败", err))
      .finally(() => {
        fetchRows("submissions")
          .then((data) => {
            if (!cancelledRef.current) setRows(data);
          })
          .catch(() => {});
      });
  }

  function handleRowsChange(nextVisible: Row[]) {
    const previous = rows;
    const next = reconcileRows(previous, visibleRows, nextVisible);
    setRows(next);
    persist(previous, next);
  }

  return (
    <div className="flex flex-col gap-4">
      <CrudManager
        title="提交"
        fields={fields}
        rows={visibleRows}
        onChange={handleRowsChange}
        onFilterSearch={(values) => setFilters(values)}
      />
    </div>
  );
}
