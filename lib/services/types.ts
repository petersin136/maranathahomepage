export type ServiceItem = {
  id: string;
  category: "Cut" | "Perm" | "Color" | "Clinic" | string;
  name: string;
  /** 기본가 (디자이너 단가 없을 때 폴백) */
  price: number;
  /** artist_id → 단가 */
  pricesByArtist?: Record<string, number>;
  durationMinutes: number;
  depositAmount: number | null;
  sortOrder: number;
};

export function priceForArtist(
  service: Pick<ServiceItem, "price" | "pricesByArtist">,
  artistId: string | null | undefined
): number {
  if (artistId && service.pricesByArtist && artistId in service.pricesByArtist) {
    return service.pricesByArtist[artistId];
  }
  return service.price;
}
