import { useQuery } from '@tanstack/react-query'
import { repo } from '@/services'
import { useSession } from '@/stores/session'
import { usePartnerHotel } from '@/stores/partner-hotel'

export const useCatalog = () => useQuery({ queryKey: ['catalog'], queryFn: repo.publicData })
export function useTourist() {
  const user = useSession(s => s.user)
  return useQuery({ queryKey: ['tourist', user?.id], queryFn: () => repo.touristData(user?.id ?? ''), enabled: user?.role === 'tourist' })
}
export function usePartnerData() {
  const user = useSession(s => s.user)
  return useQuery({ queryKey: ['partner', user?.id], queryFn: () => repo.partnerData(user?.id ?? ''), enabled: user?.role === 'partner' })
}
export function useScopedPartnerData() {
  const query = usePartnerData()
  const hotelId = usePartnerHotel(state => state.hotelId)
  if (!query.data || !hotelId || !query.data.hotels.some(hotel => hotel.id === hotelId)) return query
  const bookings = query.data.bookings.filter(booking => booking.hotelId === hotelId)
  const bookingIds = new Set(bookings.map(booking => booking.id))
  return { ...query, data: { ...query.data, hotels: query.data.hotels.filter(hotel => hotel.id === hotelId), rooms: query.data.rooms.filter(room => room.hotelId === hotelId), bookings, payments: query.data.payments.filter(payment => bookingIds.has(payment.bookingId)), refunds: query.data.refunds.filter(refund => bookingIds.has(refund.bookingId)), reviews: query.data.reviews.filter(review => review.hotelId === hotelId), settlements: query.data.settlements.filter(settlement => settlement.hotelId === hotelId) } }
}
export const useAdminData = () => useQuery({ queryKey: ['admin'], queryFn: repo.adminData })
