/**
 * 智能助手前后端契约类型：请求 / 响应 / 流式事件等随功能迭代在此扩展，
 * 服务端暂未实现，前端先按契约组装数据
 */

/** 发送给助手服务的对话请求体 */
export interface ChatRequest {
  /** 会话 ID，必须；同一会话内复用同一个值 */
  chat_session_id: string;
  /** 父消息 ID，支持分支 / 上下文；会话首条消息为 null */
  parent_message_id: string | null;
  /** 用户输入，必须 */
  prompt: string;
  /** 引用的文件 / 知识库 ID（有文件功能才保留） */
  ref_file_ids?: string[];
  /** 模型类型（多模型切换才保留） */
  model_type?: string;
  /** 是否开启联网检索（有联网检索才保留） */
  search_enabled?: boolean;
  /** 是否开启推理模式（有推理模式才保留） */
  thinking_enabled?: boolean;
  /** 是否打断上一次生成（支持流式生成 / 打断才保留） */
  preempt?: boolean;
}
