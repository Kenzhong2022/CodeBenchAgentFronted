import { redirect } from "next/navigation";

// 色系默认进入色系预览（子菜单唯一项）
export default function ColorsIndexPage() {
  redirect("/colors/preview");
}
