/** 캘린더 헤더 알림 버튼과 같은 크기·아이콘·테두리 */
export function AdminBellButton() {
  return (
    <button
      type="button"
      aria-label="알림"
      className="flex h-[36px] w-[36px] shrink-0 items-center justify-center rounded-[8px] border-[length:var(--input-border-width)] border-[color:var(--input-border)] bg-white text-[#9A948C]"
    >
      <span
        aria-hidden
        className="inline-block h-[18px] w-[18px] shrink-0 bg-current"
        style={{
          WebkitMaskImage: "url(/admin-icons/lnb/bell.png)",
          maskImage: "url(/admin-icons/lnb/bell.png)",
          WebkitMaskRepeat: "no-repeat",
          maskRepeat: "no-repeat",
          WebkitMaskPosition: "center",
          maskPosition: "center",
          WebkitMaskSize: "contain",
          maskSize: "contain"
        }}
      />
    </button>
  );
}
