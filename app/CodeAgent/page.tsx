import { redirect } from "next/navigation";

// CodeAgent 默认进入首页
export default function CodeAgentIndexPage() {
  redirect("/CodeAgent/home");
}
