import type { ReactNode } from "react";
import {
  ApiOutlined,
  AppstoreOutlined,
  BgColorsOutlined,
  BookOutlined,
  CodeOutlined,
  DashboardOutlined,
  SafetyOutlined,
  SettingOutlined,
  TeamOutlined,
} from "@ant-design/icons";

export type NavGroup = {
  key: string;
  label: string;
  icon?: ReactNode;
  // 二级菜单项，key 即带 tab 参数的目标路由；description 用于顶部导航弹出面板
  children: {
    key: string;
    label: string;
    description?: string;
    icon?: ReactNode;
  }[];
};

/**
 * 一级导航配置
 *
 * 约定：二级菜单统一使用真实子路由（如 /CodeAgent/problems、/admin/users），
 * 不再用 ?tab= 查询参数——子路由支持嵌套深链（/admin/users/[id]）、
 * 按路由分包与 middleware 前缀守卫；各模块根路径（/problems 等）重定向到默认子页
 */
export const NAV_GROUPS: NavGroup[] = [
  {
    key: "/problems",
    label: "题目中心",
    children: [
      {
        key: "/problems/list",
        label: "题目列表",
        description: "游标分页浏览题库，按数据集筛选",
        icon: <BookOutlined />,
      },
    ],
  },
  {
    key: "/colors",
    label: "色系",
    icon: <BgColorsOutlined />,
    children: [
      {
        // 子项 key 不能与分组 key 相同：antd Menu 内部按 key 建扁平映射，重复会互相覆盖
        key: "/colors/preview",
        label: "色系预览",
        description: "antd 主题颜色 token 预览",
        icon: <BgColorsOutlined />,
      },
    ],
  },
  {
    key: "/css-vars",
    label: "CSS 变量",
    icon: <ApiOutlined />,
    children: [
      {
        key: "/css-vars/preview",
        label: "CSS 变量",
        description: "antd 生成的 --ant-* CSS 变量浏览器",
        icon: <ApiOutlined />,
      },
    ],
  },
  {
    key: "/CodeAgent",
    label: "CodeAgent",
    icon: <AppstoreOutlined />,
    children: [
      {
        key: "/CodeAgent/home",
        label: "首页",
        description: "CodeAgent 总览与快捷入口",
        icon: <AppstoreOutlined />,
      },
      {
        key: "/CodeAgent/problems",
        label: "练习",
        description: "选择题目进入在线练习",
        icon: <CodeOutlined />,
      },
    ],
  },
  {
    key: "/admin",
    label: "后台管理中心",
    icon: <SettingOutlined />,
    children: [
      {
        key: "/admin/dashboard",
        label: "仪表盘",
        description: "后台运营数据总览（规划中）",
        icon: <DashboardOutlined />,
      },
      {
        key: "/admin/users",
        label: "用户管理",
        description: "账号信息管理（规划中）",
        icon: <TeamOutlined />,
      },
      {
        key: "/admin/roles",
        label: "角色管理",
        description: "角色与权限管理（规划中）",
        icon: <SafetyOutlined />,
      },
    ],
  },
];

// 按当前路径找到所属的一级导航，找不到时默认第一个
export function getActiveGroup(pathname: string): NavGroup {
  return (
    NAV_GROUPS.find((group) => pathname.startsWith(group.key)) ?? NAV_GROUPS[0]
  );
}
