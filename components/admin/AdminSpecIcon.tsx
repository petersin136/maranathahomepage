const SRC = {
  eye: "/admin-icons/eye.png",
  "eye-crossed": "/admin-icons/eye-crossed.png",
  exclamation_line: "/admin-icons/exclamation_line.png",
  check_2: "/admin-icons/check_2.png"
} as const;

export function AdminSpecIcon({
  name,
  className
}: {
  name: keyof typeof SRC;
  className?: string;
}) {
  return (
    <span
      aria-hidden
      className={className}
      style={{
        display: "inline-block",
        backgroundColor: "currentColor",
        WebkitMaskImage: `url(${SRC[name]})`,
        WebkitMaskRepeat: "no-repeat",
        WebkitMaskPosition: "center",
        WebkitMaskSize: "contain",
        maskImage: `url(${SRC[name]})`,
        maskRepeat: "no-repeat",
        maskPosition: "center",
        maskSize: "contain"
      }}
    />
  );
}
