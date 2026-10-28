import { create } from 'zustand'
import { createJSONStorage, persist } from 'zustand/middleware'

interface PartnerHotelState {
  hotelId: string
  setHotelId: (hotelId: string) => void
}

export const usePartnerHotel = create<PartnerHotelState>()(persist(
  set => ({ hotelId: '', setHotelId: hotelId => set({ hotelId }) }),
  { name: 'smarttravel.partner-hotel', storage: createJSONStorage(() => sessionStorage) },
))
