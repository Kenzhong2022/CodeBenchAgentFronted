"use client";

import { Input } from "antd";
import type { InputProps } from "antd";

/**
 * @description 下划线输入框：无边框输入框 + 底部灰色基线，聚焦时高亮线从中心向两侧展开；
 *              样式全部基于 antd CSS 变量，可放在任意主题下复用
 * @param props 透传 antd InputProps（variant 固定为 borderless，spellCheck 固定关闭）；
 *              传入的 className 会追加到内置样式之后
 */
export default function UnderlineInput({
  className,
  ...rest
}: InputProps) {
  return (
    <div className="relative group">
      {/* 默认灰色基线 */}
      <div className="absolute bottom-0 h-px w-full bg-(--ant-color-border)" />
      {/* 高亮动画线：聚焦时从中心向两侧展开 */}
      <div className="absolute bottom-0 h-[2px] w-full scale-x-0 bg-(--ant-color-primary) transition-transform duration-200 group-focus-within:scale-x-100" />
      <Input
        spellCheck={false}
        variant="borderless"
        {...rest}
        className={`pb-1! rounded-md px-2 text-base font-medium hover:bg-(--ant-color-fill-tertiary) placeholder:text-(--ant-color-text-quaternary)${className ? ` ${className}` : ""}`}
      />
    </div>
  );
}
