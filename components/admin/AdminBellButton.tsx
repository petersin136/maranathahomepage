import { clsx } from "clsx";

/** 관리자 헤더 검색·알림·새 예약. 탭마다 이 값만 쓴다. */
const HEADER_BORDER = "border-[1.5px] border-[#9A948C]";

function MaskIcon({ src, className }: { src: string; className: string }) {
  return (
    <span
      aria-hidden
      className={clsx("inline-block shrink-0 bg-current", className)}
      style={{
        WebkitMaskImage: `url(${src})`,
        maskImage: `url(${src})`,
        WebkitMaskRepeat: "no-repeat",
        maskRepeat: "no-repeat",
        WebkitMaskPosition: "center",
        maskPosition: "center",
        WebkitMaskSize: "contain",
        maskSize: "contain"
      }}
    />
  );
}

export function AdminBellButton() {
  return (
    <button
      type="button"
      aria-label="알림"
      className={clsx(
        "flex h-[36px] w-[36px] shrink-0 items-center justify-center rounded-[8px] bg-white tracking-normal text-[#9A948C]",
        HEADER_BORDER
      )}
    >
      <MaskIcon src="/admin-icons/lnb/bell.png" className="h-[18px] w-[18px]" />
    </button>
  );
}

export function AdminHeaderSearch({
  value,
  onChange,
  onFocus
}: {
  value: string;
  onChange: (value: string) => void;
  onFocus?: () => void;
}) {
  return (
    <label
      className={clsx(
        "flex h-[36px] w-[308px] shrink-0 items-center gap-[8px] rounded-[8px] bg-white px-[12px] tracking-normal",
        HEADER_BORDER
      )}
    >
      <MaskIcon src="/admin-icons/lnb/search-bold.png" className="h-[16px] w-[16px] text-[#9A948C]" />
      <input
        value={value}
        onChange={(e) => onChange(e.target.value)}
        onFocus={onFocus}
        placeholder="고객명, 연락처 검색"
        className="min-w-0 flex-1 border-0 bg-transparent p-0 font-sans-kr text-[15px] font-bold leading-none tracking-normal text-[#1C1C1C] outline-none placeholder:text-[#9A948C] [text-box-edge:cap_alphabetic] [text-box-trim:trim-both]"
      />
    </label>
  );
}

export function AdminNewBookingButton({
  onClick,
  disabled,
  className
}: {
  onClick: () => void;
  disabled?: boolean;
  className?: string;
}) {
  return (
    <button
      type="button"
      disabled={disabled}
      onClick={onClick}
      className={clsx(
        "inline-flex h-[34px] w-[136px] shrink-0 items-center justify-center gap-[8px] rounded-[8px] bg-[#2F3A2F] text-[14px] font-bold leading-none tracking-normal text-white disabled:opacity-40",
        className
      )}
    >
      <MaskIcon src="/admin-icons/lnb/plus.png" className="h-[14px] w-[14px]" />
      <span className="[text-box-edge:cap_alphabetic] [text-box-trim:trim-both]">새 예약</span>
    </button>
  );
}
