/**
 * 轻量登录态：登录成功后由登录页写入 localStorage，
 * TopNav 读取后决定头像行为（弹出菜单 / 跳转登录页）。
 * 仅作 UI 层面的会话标记，鉴权仍以服务端 API 为准。
 */

export interface SessionUser {
  id: string;
  email: string;
  name: string;
}

const KEY = "cb_user";

export function getSessionUser(): SessionUser | null {
  if (typeof window === "undefined") return null;
  const raw = window.localStorage.getItem(KEY);
  if (!raw) return null;
  try {
    const parsed = JSON.parse(raw) as SessionUser;
    return parsed.id && parsed.email ? parsed : null;
  } catch {
    return null;
  }
}

export function setSessionUser(user: SessionUser): void {
  window.localStorage.setItem(KEY, JSON.stringify(user));
}

export function clearSessionUser(): void {
  window.localStorage.removeItem(KEY);
}
