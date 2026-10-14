import { clsx } from "clsx";

/** 캘린더 `.cal-title`과 같은 크기·시작 위치 (main py-10 안에서 margin-top 31px) */
export function AdminPageTitle({
  children,
  className
}: {
  children: React.ReactNode;
  className?: string;
}) {
  return (
    <h1
      className={clsx(
        "mt-[31px] text-[24px] font-bold leading-[24px] tracking-[-0.02em] text-[color:var(--ink)] [text-box-edge:cap_alphabetic] [text-box-trim:trim-both]",
        className
      )}
    >
      {children}
    </h1>
  );
}
