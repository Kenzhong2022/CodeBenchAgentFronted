/**
 * @description 站内跳转守卫：页面（如通话房间）注册守卫后，导航组件在跳转前先询问，
 *              取消跳转或确认离开（顺便关闭房间）后再决定是否继续。
 */

/** @description 返回 false 表示取消本次跳转 */
type LeaveGuard = () => Promise<boolean>;

let activeGuard: LeaveGuard | null = null;

/** @description 注册守卫；同一时间只保留最新注册的守卫 */
export function setLeaveGuard(guard: LeaveGuard): void {
  activeGuard = guard;
}

/** @description 只清除自己注册的守卫，避免误删其他页面新注册的守卫 */
export function clearLeaveGuard(guard: LeaveGuard): void {
  if (activeGuard === guard) activeGuard = null;
}

/** @description 跳转前调用：没有守卫直接放行，否则等待守卫确认 */
export async function canLeavePage(): Promise<boolean> {
  if (!activeGuard) return true;
  return activeGuard();
}
