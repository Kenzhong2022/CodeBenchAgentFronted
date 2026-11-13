import { redirect } from "next/navigation";

// 题目中心默认进入题目列表（子菜单唯一项）
export default function ProblemsIndexPage() {
  redirect("/problems/list");
}
