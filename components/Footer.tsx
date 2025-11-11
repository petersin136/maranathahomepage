import Link from "next/link";

export default function Footer() {
  const year = new Date().getFullYear();

  return (
    <footer id="contact" className="border-t border-neutral-200 bg-white py-10 dark:border-neutral-800 dark:bg-neutral-950">
      <div className="mx-auto flex max-w-6xl flex-col gap-8 px-6 text-sm text-neutral-600 sm:flex-row sm:items-center sm:justify-between sm:px-8 dark:text-neutral-300">
        <div>
          <p className="font-semibold text-neutral-900 dark:text-neutral-50">Simple Template</p>
          <p className="mt-2 max-w-sm leading-relaxed">
            반복되는 프로젝트를 위한 기본 템플릿입니다. 섹션을 원하는 대로 조합하고 텍스트만 교체해 빠르게 출시하세요.
          </p>
        </div>
        <div className="flex flex-wrap items-center gap-4">
          <Link href="mailto:hello@example.com" className="hover:text-neutral-900 dark:hover:text-neutral-100">
            이메일
          </Link>
          <Link href="https://example.com" className="hover:text-neutral-900 dark:hover:text-neutral-100">
            공식 사이트
          </Link>
          <Link href="https://github.com" className="hover:text-neutral-900 dark:hover:text-neutral-100">
            GitHub
          </Link>
        </div>
      </div>
      <div className="mt-6 text-center text-xs text-neutral-500 dark:text-neutral-400">
        © {year} Simple Template. All rights reserved.
      </div>
    </footer>
  );
}
