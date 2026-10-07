"use client";

import { AdminDatePicker } from "@/components/admin/AdminDatePicker";

export function ReminderDateField({
  value,
  onChange,
  label
}: {
  value: string;
  onChange: (ymd: string) => void;
  label: string;
}) {
  return (
    <AdminDatePicker
      value={value}
      onChange={onChange}
      ariaLabel={label}
      className="h-[40px] w-full rounded-[8px] border-[1.5px] border-[#9A948C] bg-white px-3 text-[15px] font-medium text-[#1C1C1C]"
    />
  );
}
