export const getBusinessBookingSlug = (business) =>
  String(business?.bookingSlug || business?.slug || "").trim().toLowerCase()

export const buildPublicBookingUrl = (business, origin = window.location.origin) => {
  const slug = getBusinessBookingSlug(business)
  return slug ? `${origin}/book/${slug}` : ""
}
