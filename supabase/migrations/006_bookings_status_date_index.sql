-- Composite index for pending list (status filter + date/time order)
-- Existing single-column indexes:
--   bookings_booking_date_idx, bookings_status_idx (001_create_bookings.sql)
CREATE INDEX IF NOT EXISTS bookings_status_booking_date_idx
  ON public.bookings (status, booking_date);
