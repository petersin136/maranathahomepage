import { CustomerFiltersProvider } from "@/components/admin/CustomerFilters";

export default function AdminCustomersLayout({ children }: { children: React.ReactNode }) {
  return <CustomerFiltersProvider>{children}</CustomerFiltersProvider>;
}
