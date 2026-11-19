import fs from "fs";
import { defaultLanguage } from "@cloudflare/realtimekit-react-ui";

try {
  const jsonString = JSON.stringify(defaultLanguage, null, 2);
  fs.writeFileSync("realtimekit-english-keys.json", jsonString, "utf-8");
  console.log(
    "✅ 导出成功！已保存到项目根目录的 realtimekit-english-keys.json",
  );
} catch (error) {
  console.error("❌ 导出失败，请尝试方案二。", error);
}
