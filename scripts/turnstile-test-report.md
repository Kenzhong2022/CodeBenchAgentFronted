# Turnstile 反向验证报告

- **测试时间**：2026/11/18 17:15:08
- **目标服务**：http://localhost:3000
- **结论**：通过 7，失败 0，跳过 2
  （SKIP = 需要真实 token 的高级用例，见各行"说明"；403 = 被人机验证拦截，非 403 = 通过网关进入业务逻辑）

| 编号 | 用例 | 接口 | 攻击描述 | 实际结果 | 预期 | 判定 | 说明 |
| --- | --- | --- | --- | --- | --- | --- | --- |
| T1 | 无 token 直连 | 登录 /api/auth/login | 脚本不带 turnstileToken 直接调用接口 | 403 请先完成人机验证 | 403 | 通过 | 未携带凭据被拒绝 |
| T2 | 伪造 token | 登录 /api/auth/login | 脚本伪造任意字符串充当 turnstileToken | 403 人机验证未通过，请重试 | 403 | 通过 | 无效凭据被 siteverify 拒绝 |
| T1 | 无 token 直连 | 注册 /api/auth/register | 脚本不带 turnstileToken 直接调用接口 | 403 请先完成人机验证 | 403 | 通过 | 未携带凭据被拒绝 |
| T2 | 伪造 token | 注册 /api/auth/register | 脚本伪造任意字符串充当 turnstileToken | 403 人机验证未通过，请重试 | 403 | 通过 | 无效凭据被 siteverify 拒绝 |
| T1 | 无 token 直连 | 发码 /api/auth/send-code | 脚本不带 turnstileToken 直接调用接口 | 403 请先完成人机验证 | 403 | 通过 | 未携带凭据被拒绝 |
| T2 | 伪造 token | 发码 /api/auth/send-code | 脚本伪造任意字符串充当 turnstileToken | 403 人机验证未通过，请重试 | 403 | 通过 | 无效凭据被 siteverify 拒绝 |
| T0 | 正向对照（真实 token） | 登录 /api/auth/login | 携带真实未使用 token 应放行（非 403） | 跳过 | 非 403 | 跳过 | 需 --valid-token <未使用的真实 token>（浏览器 Network 复制，勿先提交） |
| T3 | 重放攻击 | 登录 /api/auth/login | 同一真实 token 连续使用两次，第二次应 403（一次性消费） | 第一次 401，第二次 403 | 第一次非 403，第二次 403 | 通过 | 令牌一次性消费验证成立 |
| T4 | action 错配 | 登录 /api/auth/login | 携带 send_code action 的合法 token 调用登录接口（应 403） | 跳过 | 403 | 跳过 | 需 --sendcode-token <发码接口的真实 token> |

## 高级用例取 token 方法

在浏览器登录/注册页完成一次验证，DevTools → Network → 找到对应请求 → 复制请求体里的 `turnstileToken`：
- T3 重放：复制一个**未提交过**的登录 token，运行 `node scripts/turnstile-test.mjs --replay-token <token>`
- T4 错配：复制注册页发码请求的 token，运行 `node scripts/turnstile-test.mjs --sendcode-token <token>`
- T0 正向：复制一个未提交过的登录 token，运行 `node scripts/turnstile-test.mjs --valid-token <token>`
