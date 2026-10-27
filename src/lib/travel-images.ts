const images = {
  coast: '/images/da-nang-coast.webp',
  highlands: '/images/da-lat-pines.webp',
  oldTown: '/images/hoi-an-lanterns.webp',
  heritage: '/images/hue-citadel.webp',
  roomDeluxe: '/images/room-deluxe.png',
  roomFamily: '/images/room-family-suite.png',
  roomRiver: '/images/room-river-view.png',
  roomGarden: '/images/room-garden-view.png',
} as const

export function travelImage(city: string) {
  if (city === 'Đà Lạt') return images.highlands
  if (city === 'Quảng Nam') return images.oldTown
  if (city === 'Huế') return images.heritage
  if (city === 'Đà Nẵng') return images.coast
  return undefined
}

export function roomImage(roomId: string) {
  const normalized = roomId.toLowerCase()
  if (normalized.includes('family') || normalized.includes('suite')) return images.roomFamily
  if (normalized.includes('river') || normalized.includes('lotus') || normalized.includes('classic')) return images.roomRiver
  if (normalized.includes('garden') || normalized.includes('dalat') || normalized.includes('pine') || normalized.includes('lantern')) return images.roomGarden
  return images.roomDeluxe
}

export const heroImage = images.coast
