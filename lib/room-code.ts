/**
 * @description 短房间号：9 位数字 → 房间元数据（会议 UUID / 房主 / 状态），存于 Upstash Redis。
 *              短号仅用于展示和分享，加入时由服务端换回真实会议号。
 */

const ROOM_CODE_PREFIX = "rtk:room:";
/** 用户当前关联的房间：一个用户同一时间只能关联一个房间 */
const USER_ROOM_PREFIX = "rtk:user:";
/** 短号有效期 30 天，过期后房间号不可再加入 */
const ROOM_CODE_TTL_SECONDS = 60 * 60 * 24 * 30;

/** @description 房间元数据；status 为 closed 时不再签发 token */
export type RoomRecord = {
  meetingId: string;
  ownerId: string | null;
  /** 房间名称：创建时由房主填写，默认「用户名 + 视频会议」 */
  name: string;
  status: "open" | "closed";
  createdAt: number;
};

/** @description 是否配置了 Upstash Redis（生产环境通过 wrangler secret 注入） */
export function isCodeStoreConfigured(): boolean {
  return Boolean(
    process.env.UPSTASH_REDIS_REST_URL &&
      process.env.UPSTASH_REDIS_REST_TOKEN,
  );
}

/** @description 生成 9 位数字房间号，形如 656350569 */
export function generateRoomCode(): string {
  const buf = new Uint32Array(1);
  crypto.getRandomValues(buf);
  return String(100_000_000 + (buf[0] % 900_000_000));
}

/** @description 校验是否为合法的 9 位数字房间号 */
export function isValidRoomCode(value: string): boolean {
  return /^\d{9}$/.test(value);
}

/** @description 展示用格式：656 350 569 */
export function formatRoomCode(code: string): string {
  return code.replace(/(\d{3})(?=\d)/g, "$1 ");
}

async function redisCommand(command: (string | number)[]): Promise<unknown> {
  const url = process.env.UPSTASH_REDIS_REST_URL;
  const token = process.env.UPSTASH_REDIS_REST_TOKEN;
  if (!url || !token) throw new Error("短号服务未配置");

  const res = await fetch(url, {
    method: "POST",
    headers: {
      Authorization: `Bearer ${token}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify(command),
    cache: "no-store",
    signal: AbortSignal.timeout(5_000),
  });
  if (!res.ok) throw new Error(`Redis ${res.status}`);

  const json = (await res.json().catch(() => null)) as {
    result?: unknown;
  } | null;
  return json?.result ?? null;
}

/** @description 写入房间记录；短号已存在时返回 false（用于撞号重试） */
async function saveRoom(
  code: string,
  record: RoomRecord,
  onlyIfAbsent: boolean,
): Promise<boolean> {
  const command: (string | number)[] = [
    "SET",
    `${ROOM_CODE_PREFIX}${code}`,
    JSON.stringify(record),
    "EX",
    ROOM_CODE_TTL_SECONDS,
  ];
  if (onlyIfAbsent) command.push("NX");
  return (await redisCommand(command)) === "OK";
}

/** @description 为新会议分配一个未被占用的短号，最多重试 5 次 */
export async function createRoomCode(
  meetingId: string,
  ownerId: string,
  name: string,
): Promise<string> {
  const record: RoomRecord = {
    meetingId,
    ownerId,
    name,
    status: "open",
    createdAt: Date.now(),
  };
  for (let attempt = 0; attempt < 5; attempt += 1) {
    const code = generateRoomCode();
    if (await saveRoom(code, record, true)) return code;
  }
  throw new Error("无法分配房间号");
}

/** @description 读取房间记录；短号不存在或已过期返回 null */
export async function getRoom(code: string): Promise<RoomRecord | null> {
  const value = await redisCommand(["GET", `${ROOM_CODE_PREFIX}${code}`]);
  if (typeof value !== "string") return null;
  try {
    const parsed = JSON.parse(value) as Partial<RoomRecord>;
    if (!parsed.meetingId) return null;
    return {
      meetingId: parsed.meetingId,
      ownerId: parsed.ownerId ?? null,
      name: typeof parsed.name === "string" ? parsed.name : "",
      status: parsed.status === "closed" ? "closed" : "open",
      createdAt: parsed.createdAt ?? 0,
    };
  } catch {
    return null;
  }
}

/** @description 读取用户当前关联的房间号；没有关联或格式非法返回 null */
export async function getUserRoom(userId: string): Promise<string | null> {
  const value = await redisCommand(["GET", `${USER_ROOM_PREFIX}${userId}`]);
  return typeof value === "string" && isValidRoomCode(value) ? value : null;
}

/** @description 记录用户当前关联的房间，保证一个用户最多只关联一个房间 */
export async function setUserRoom(userId: string, code: string): Promise<void> {
  await redisCommand([
    "SET",
    `${USER_ROOM_PREFIX}${userId}`,
    code,
    "EX",
    ROOM_CODE_TTL_SECONDS,
  ]);
}

/**
 * @description 清除用户房间关联；传入 code 时只在当前关联正好是该房间时清除，
 *              避免并发切换房间时误删新关联
 */
export async function clearUserRoom(
  userId: string,
  code?: string,
): Promise<void> {
  if (code && (await getUserRoom(userId)) !== code) return;
  await redisCommand(["DEL", `${USER_ROOM_PREFIX}${userId}`]);
}

/** @description 房主关闭房间：保留记录（便于提示「房间已关闭」），但不再允许加入 */
export async function closeRoom(
  code: string,
  ownerId: string,
): Promise<"ok" | "not-found" | "forbidden"> {
  const room = await getRoom(code);
  if (!room) return "not-found";
  if (room.ownerId && room.ownerId !== ownerId) return "forbidden";

  await saveRoom(code, { ...room, status: "closed" }, false);
  // 房间关闭后房主不再关联该房间，可以创建 / 加入下一个房间
  if (room.ownerId) await clearUserRoom(room.ownerId, code);
  return "ok";
}

/** @description 房主修改房间名称；分享文案与进入面板展示同步更新 */
export async function renameRoom(
  code: string,
  ownerId: string,
  name: string,
): Promise<"ok" | "not-found" | "forbidden"> {
  const room = await getRoom(code);
  if (!room) return "not-found";
  if (room.ownerId && room.ownerId !== ownerId) return "forbidden";

  await saveRoom(code, { ...room, name }, false);
  return "ok";
}
