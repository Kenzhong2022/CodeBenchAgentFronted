import { redirect } from "next/navigation";

// CSS 变量默认进入变量预览（子菜单唯一项）
export default function CssVarsIndexPage() {
  redirect("/css-vars/preview");
}
