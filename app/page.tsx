import { redirect } from "next/navigation";

// 根路径重定向到 CodeAgent 首页（题目列表已迁入后台管理中心）
export default function Home() {
  redirect("/CodeAgent/home");
}
