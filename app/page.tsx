import { redirect } from "next/navigation";

// 根路径重定向到题目中心（题目列表标签页）
export default function Home() {
  redirect("/problems?tab=list");
}
