import { redirect } from "next/navigation";

// /problems 旧路径兼容重定向：题目列表已迁移为 /admin/problems
export default function ProblemsIndexPage() {
  redirect("/admin/problems");
}
