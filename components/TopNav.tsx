"use client";
import { Children, isValidElement, Suspense, useEffect, useState } from "react";
import type { ReactNode } from "react";

import {
  Avatar,
  Button,
  Col,
  Dropdown,
  Flex,
  Input,
  Layout,
  Menu,
  Row,
  Space,
  Typography,
  theme,
} from "antd";
import type { MenuProps } from "antd";
import {
  LogoutOutlined,
  MenuFoldOutlined,
  MenuUnfoldOutlined,
  SearchOutlined,
  SettingOutlined,
  UserOutlined,
} from "@ant-design/icons";
import { usePathname, useRouter } from "next/navigation";
import { NAV_GROUPS, getActiveGroup } from "./navConfig";
import { useThemeMode, type ThemeMode } from "./useThemeMode";
import { clearSessionUser, getSessionUser, type SessionUser } from "@/lib/session";

// 弹出面板里的菜单项：标题 + 描述，整体可点击；active 时用主色浅背景高亮
function NavMenuItem({
  title,
  description,
  active,
}: {
  title: string;
  description?: string;
  active?: boolean;
}) {
  return (
    <div className={`nav-popup-item${active ? " active" : ""}`}>
      <Space vertical size={4} style={{ padding: "8px 12px" }}>
        <Typography.Title level={5} style={{ margin: 0 }}>
          {title}
        </Typography.Title>
        {description && (
          <Typography.Paragraph
            type="secondary"
            className="nav-popup-item-desc"
            style={{ margin: 0 }}
          >
            {description}
          </Typography.Paragraph>
        )}
      </Space>
    </div>
  );
}

// 顶部导航：收缩按钮 + logo + 一级导航（首页 / 资源中心）+ 右侧操作
export default function TopNav({
  collapsed,
  onToggle,
}: {
  collapsed: boolean;
  onToggle: () => void;
}) {
  const pathname = usePathname();
  const router = useRouter();
  const activeGroup = getActiveGroup(pathname);
  // 与 SideNav 同一算法：当前 URL 匹配到的二级菜单 key（子路由前缀匹配），
  // 用于弹出面板高亮当前项；无命中时高亮分组第一项
  const currentKey =
    activeGroup.children.find((child) => pathname.startsWith(child.key))?.key ??
    activeGroup.children[0]?.key;
  const [searchOpen, setSearchOpen] = useState(false);
  const [keyword, setKeyword] = useState("");
  const { token } = theme.useToken();
  const { mode, setMode } = useThemeMode();
  // localStorage 登录态在客户端挂载后读取，避免 SSR 水合不一致
  const [user, setUser] = useState<SessionUser | null>(null);
  useEffect(() => {
    setUser(getSessionUser());
  }, []);

  // 弹出面板样式：参考 antd mega-menu 示例，用主题 token 保持与整体风格一致
  const popupStyle: React.CSSProperties = {
    padding: token.padding,
    minWidth: 480,
    background: token.colorBgElevated,
    borderRadius: token.borderRadiusLG,
    boxShadow: token.boxShadowSecondary,
  };

  // 一级菜单：children 换成带描述的大块菜单项，触发 mega-menu 弹出面板
  const navItems: MenuProps["items"] = NAV_GROUPS.map((group) => ({
    key: group.key,
    icon: group.icon,
    label: group.label,
    children: group.children.map((child) => ({
      key: child.key,
      label: (
        <NavMenuItem
          title={child.label}
          description={child.description}
          active={child.key === currentKey}
        />
      ),
    })),
  }));

  // 自定义弹出面板：分组标题 + 两列网格展示子菜单项
  const popupRender: MenuProps["popupRender"] = (_, { item }) => (
    <Flex vertical gap={12} style={popupStyle}>
      <Typography.Title
        level={3}
        style={{
          margin: 0,
          paddingBottom: token.paddingXS,
          borderBottom: `${token.lineWidth}px ${token.lineType} ${token.colorSplit}`,
        }}
      >
        {item.title}
      </Typography.Title>
      <Row gutter={16}>
        {Children.map(item.children as ReactNode, (child) =>
          isValidElement(child) ? (
            <Col span={12} key={child.key}>
              {child}
            </Col>
          ) : null
        )}
      </Row>
    </Flex>
  );

  return (
    <Layout.Header
      style={{
        display: "flex",
        alignItems: "center",
        gap: 16,
        padding: "0 24px",
        background: token.colorBgContainer,
      }}
    >
      <Button
        type="text"
        icon={collapsed ? <MenuUnfoldOutlined /> : <MenuFoldOutlined />}
        onClick={onToggle}
        aria-label={collapsed ? "展开侧边栏" : "收起侧边栏"}
        style={{ fontSize: 16, width: 40, paddingInline: 8 }}
      />
      <Menu
        mode="horizontal"
        className="top-nav-menu"
        selectedKeys={[activeGroup.key]}
        style={{ flex: 1, minWidth: 0, borderBottom: "none" }}
        items={navItems}
        popupRender={popupRender}
        // 点击一级菜单跳到该分组第一项；点击弹出面板里的子菜单直接跳对应路由
        onClick={({ key }) => {
          if (key.startsWith("/")) {
            router.push(key);
            return;
          }
          const group = NAV_GROUPS.find((item) => item.key === key);
          if (group) router.push(group.children[0].key);
        }}
      />
      <style jsx global>{`
        .nav-popup-item {
          border-radius: ${token.borderRadius}px;
          transition: all ${token.motionDurationMid};
          cursor: pointer;
        }
        .nav-popup-item:hover {
          background: ${token.colorFillTertiary};
        }
        .nav-popup-item.active {
          background: ${token.colorPrimaryBg};
        }
        .nav-popup-item.active:hover {
          background: ${token.colorPrimaryBgHover};
        }
        /* 描述过长时自动换行，避免长单词/长串字符撑破弹出面板 */
        .nav-popup-item-desc {
          white-space: normal;
          word-break: break-word;
          overflow-wrap: anywhere;
        }
      `}</style>
      {/* 右侧操作区：图标按钮统一用 shape="circle" 的 Button */}
      <Space size={8}>
        {searchOpen ? (
          <Input
            autoFocus
            allowClear
            value={keyword}
            onChange={(e) => setKeyword(e.target.value)}
            placeholder="搜索"
            prefix={<SearchOutlined />}
            style={{ width: 200 }}
            // 没输入内容时失焦即收起，避免输入框一直占着位置
            onBlur={() => {
              if (!keyword) setSearchOpen(false);
            }}
          />
        ) : (
          <Button
            type="text"
            shape="circle"
            icon={<SearchOutlined />}
            aria-label="搜索"
            onClick={() => setSearchOpen(true)}
          />
        )}
        <Button
          type="text"
          shape="circle"
          icon={<SettingOutlined />}
          aria-label="设置"
        />
        {/* 未登录 -> 「登录」文本入口，点击进入登录页；
            已登录 -> 头像弹出 Dropdown（主题分组 + 退出登录） */}
        {user ? (
          <Dropdown
            trigger={["click"]}
            placement="bottomRight"
            menu={{
              items: [
                {
                  key: "theme",
                  type: "group",
                  label: "主题",
                  children: [
                    { key: "light", label: "亮色" },
                    { key: "dark", label: "暗色" },
                    { key: "system", label: "跟随系统" },
                  ],
                },
                { type: "divider" },
                { key: "logout", icon: <LogoutOutlined />, label: "退出登录", danger: true },
              ],
              selectedKeys: [mode],
              onClick: ({ key }) => {
                if (key === "logout") {
                  // 同时清除服务端会话 Cookie 与本地 UI 登录标记
                  void fetch("/api/auth/logout", { method: "POST" });
                  clearSessionUser();
                  setUser(null);
                  router.push("/login");
                  return;
                }
                if (["light", "dark", "system"].includes(key)) {
                  setMode(key as ThemeMode);
                }
              },
            }}
          >
            <Avatar
              size="small"
              icon={<UserOutlined />}
              aria-label="用户菜单"
              style={{ cursor: "pointer" }}
            />
          </Dropdown>
        ) : (
          <Button type="text" onClick={() => router.push("/login")}>
            登录
          </Button>
        )}
      </Space>
    </Layout.Header>
  );
}
