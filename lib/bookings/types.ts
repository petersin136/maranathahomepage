export type BookingStatus =
  | "pending"
  | "confirmed"
  | "completed"
  | "cancelled"
  | "noshow";

export type CustomerGender = "W" | "M";

export type BookingRow = {
  id: string;
  created_at: string;
  updated_at: string;
  booking_date: string;
  booking_time: string;
  artist_id: string;
  artist_name: string | null;
  service_ids: string[];
  service_names: string[] | null;
  customer_name: string;
  customer_gender: CustomerGender | null;
  customer_phone: string;
  customer_request: string | null;
  privacy_agreed: boolean;
  status: BookingStatus;
  deposit_paid: boolean;
  admin_memo: string | null;
  total_amount: number | null;
  deposit_amount: number | null;
};

export type CreateBookingBody = {
  bookingDate: string; // YYYY-MM-DD
  bookingTime: string;
  artistId: string;
  artistName?: string | null;
  serviceIds: string[];
  serviceNames?: string[] | null;
  customerName: string;
  customerGender?: CustomerGender | null;
  customerPhone: string;
  customerRequest?: string | null;
  privacyAgreed: boolean;
  totalAmount?: number | null;
  depositAmount?: number | null;
};
