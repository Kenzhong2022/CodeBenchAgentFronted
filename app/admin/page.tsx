import { redirect } from "next/navigation";

// 后台管理中心默认进入仪表盘
export default function AdminIndexPage() {
  redirect("/admin/dashboard");
}
