-- 지출: 결제 수단 · 증빙 유형 (세금계산서 / 사업자카드 / 간이영수증 / 미증빙)
alter table public.expenses
  add column if not exists payment_method text,
  add column if not exists proof_type text;

update public.expenses
set proof_type = case
  when has_tax_invoice is true then 'tax_invoice'
  else 'none'
end
where proof_type is null;
