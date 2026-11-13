import { redirect } from "next/navigation";

// 根路径重定向到题目中心（题目列表子路由）
export default function Home() {
  redirect("/problems/list");
}
