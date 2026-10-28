import { lazy, Suspense } from 'react'
import { Navigate, Outlet, Route, Routes, useLocation } from 'react-router'
import { LoadingState } from '@/components/common'
import { AuthLayout, DashboardLayout, NotFound, TouristLayout } from './layouts'
import { useSession } from '@/stores/session'
import type { Role } from '@/types/domain'

const Home = lazy(() => import('@/features/public/home').then(m => ({ default: m.HomePage })))
const Explore = lazy(() => import('@/features/public/catalog').then(m => ({ default: m.ExplorePage })))
const DestinationDetail = lazy(() => import('@/features/public/catalog').then(m => ({ default: m.DestinationDetailPage })))
const Hotels = lazy(() => import('@/features/public/catalog').then(m => ({ default: m.HotelsPage })))
const HotelDetail = lazy(() => import('@/features/public/hotel-detail').then(m => ({ default: m.HotelDetailModernPage })))
const Profile = lazy(() => import('@/features/public/account').then(m => ({ default: m.ProfilePage })))
const Preferences = lazy(() => import('@/features/public/account').then(m => ({ default: m.PreferencesPage })))
const Favorites = lazy(() => import('@/features/public/account').then(m => ({ default: m.FavoritesPage })))
const Recommendations = lazy(() => import('@/features/public/account').then(m => ({ default: m.RecommendationsPage })))
const Login = lazy(() => import('@/features/auth/pages').then(m => ({ default: m.LoginPage })))
const Register = lazy(() => import('@/features/auth/pages').then(m => ({ default: m.RegisterPage })))
const VerifyOtp = lazy(() => import('@/features/auth/pages').then(m => ({ default: m.VerifyOtpPage })))
const ForgotPassword = lazy(() => import('@/features/auth/pages').then(m => ({ default: m.ForgotPasswordPage })))
const ResetPassword = lazy(() => import('@/features/auth/pages').then(m => ({ default: m.ResetPasswordPage })))
const Planner = lazy(() => import('@/features/trips/planner').then(m => ({ default: m.PlannerPage })))
const Trips = lazy(() => import('@/features/trips/pages').then(m => ({ default: m.TripsPage })))
const TripForm = lazy(() => import('@/features/trips/pages').then(m => ({ default: m.TripFormPage })))
const TripDetail = lazy(() => import('@/features/trips/itinerary-detail').then(m => ({ default: m.ItineraryDetailPage })))
const BookingNew = lazy(() => import('@/features/bookings/pages').then(m => ({ default: m.BookingNewPage })))
const Bookings = lazy(() => import('@/features/bookings/pages').then(m => ({ default: m.BookingsPage })))
const BookingDetail = lazy(() => import('@/features/bookings/pages').then(m => ({ default: m.BookingDetailPage })))
const Payment = lazy(() => import('@/features/bookings/pages').then(m => ({ default: m.PaymentPage })))
const PaymentResult = lazy(() => import('@/features/bookings/pages').then(m => ({ default: m.PaymentResultPage })))
const BookingCheckout = lazy(() => import('@/features/bookings/checkout').then(m => ({ default: m.BookingCheckoutPage })))
const MyRefunds = lazy(() => import('@/features/bookings/refunds').then(m => ({ default: m.MyRefundsPage })))
const PartnerHome = lazy(() => import('@/features/partner/dashboard').then(m => ({ default: m.PartnerDashboardPage })))
const PartnerHotel = lazy(() => import('@/features/partner/hotel-pages').then(m => ({ default: m.PartnerHotelPage })))
const PartnerHotelForm = lazy(() => import('@/features/partner/hotel-pages').then(m => ({ default: m.PartnerHotelFormPage })))
const PartnerRooms = lazy(() => import('@/features/partner/hotel-pages').then(m => ({ default: m.PartnerRoomsModernPage })))
const PartnerRoomForm = lazy(() => import('@/features/partner/hotel-pages').then(m => ({ default: m.PartnerRoomModernFormPage })))
const PartnerRoomDetail = lazy(() => import('@/features/partner/hotel-pages').then(m => ({ default: m.PartnerRoomDetailPage })))
const PartnerAmenities = lazy(() => import('@/features/partner/hotel-pages').then(m => ({ default: m.PartnerAmenitiesPage })))
const PartnerCancellationPolicies = lazy(() => import('@/features/partner/hotel-pages').then(m => ({ default: m.PartnerCancellationPolicyPage })))
const PartnerMedia = lazy(() => import('@/features/partner/hotel-pages').then(m => ({ default: m.PartnerMediaPage })))
const PartnerBookings = lazy(() => import('@/features/partner/booking-pages').then(m => ({ default: m.PartnerBookingsPage })))
const PartnerBookingHistory = lazy(() => import('@/features/partner/booking-pages').then(m => ({ default: () => <m.PartnerBookingsPage history /> })))
const PartnerBookingDetail = lazy(() => import('@/features/partner/booking-pages').then(m => ({ default: m.PartnerBookingDetailPage })))
const PartnerBookingCalendar = lazy(() => import('@/features/partner/booking-pages').then(m => ({ default: m.PartnerBookingCalendarPage })))
const PartnerRevenue = lazy(() => import('@/features/partner/finance-pages').then(m => ({ default: m.PartnerRevenuePage })))
const PartnerPayments = lazy(() => import('@/features/partner/finance-pages').then(m => ({ default: m.PartnerPaymentsPage })))
const PartnerPayouts = lazy(() => import('@/features/partner/finance-pages').then(m => ({ default: m.PartnerPayoutsPage })))
const PartnerRefunds = lazy(() => import('@/features/partner/finance-pages').then(m => ({ default: m.PartnerRefundsPage })))
const PartnerReviews = lazy(() => import('@/features/partner/finance-pages').then(m => ({ default: m.PartnerReviewsPage })))
const PartnerProfile = lazy(() => import('@/features/partner/finance-pages').then(m => ({ default: m.PartnerProfilePage })))
const AdminHome = lazy(() => import('@/features/admin/dashboard').then(m => ({ default: m.AdminDashboard })))
const AdminUsers = lazy(() => import('@/features/admin/core-pages').then(m => ({ default: m.AdminUsersPage })))
const AdminUserDetail = lazy(() => import('@/features/admin/core-pages').then(m => ({ default: m.AdminUserDetailPage })))
const AdminHotels = lazy(() => import('@/features/admin/core-pages').then(m => ({ default: m.AdminHotelsPage })))
const AdminHotelDetail = lazy(() => import('@/features/admin/core-pages').then(m => ({ default: m.AdminHotelDetailPage })))
const AdminBookings = lazy(() => import('@/features/admin/core-pages').then(m => ({ default: m.AdminBookingsPage })))
const AdminBookingDetail = lazy(() => import('@/features/admin/core-pages').then(m => ({ default: m.AdminBookingDetailPage })))
const AdminPayments = lazy(() => import('@/features/admin/finance-pages').then(m => ({ default: m.AdminPaymentsPage })))
const AdminPaymentDetail = lazy(() => import('@/features/admin/finance-pages').then(m => ({ default: m.AdminPaymentDetailPage })))
const AdminRefunds = lazy(() => import('@/features/admin/finance-pages').then(m => ({ default: m.AdminRefundsPage })))
const AdminRefundDetail = lazy(() => import('@/features/admin/finance-pages').then(m => ({ default: m.AdminRefundDetailPage })))
const AdminPayouts = lazy(() => import('@/features/admin/finance-pages').then(m => ({ default: m.AdminPayoutsPage })))
const AdminPayoutDetail = lazy(() => import('@/features/admin/finance-pages').then(m => ({ default: m.AdminPayoutDetailPage })))
const AdminDestinations = lazy(() => import('@/features/admin/content-pages').then(m => ({ default: m.AdminDestinationsPage })))
const AdminDestinationForm = lazy(() => import('@/features/admin/content-pages').then(m => ({ default: m.AdminDestinationFormPage })))
const AdminTopics = lazy(() => import('@/features/admin/content-pages').then(m => ({ default: m.AdminTopicsPage })))
const AdminReviewsModern = lazy(() => import('@/features/admin/content-pages').then(m => ({ default: m.AdminReviewsModernPage })))
const AdminItineraries = lazy(() => import('@/features/admin/content-pages').then(m => ({ default: m.AdminItinerariesPage })))
const AdminItineraryDetail = lazy(() => import('@/features/admin/content-pages').then(m => ({ default: m.AdminItineraryDetailPage })))
const AdminPartners = lazy(() => import('@/features/admin/pages').then(m => ({ default: m.AdminPartnersPage })))
const AdminPartnerDetail = lazy(() => import('@/features/admin/pages').then(m => ({ default: m.AdminPartnerDetailPage })))
const AdminServices = lazy(() => import('@/features/admin/pages').then(m => ({ default: m.AdminServicesPage })))
const AdminCategories = lazy(() => import('@/features/admin/pages').then(m => ({ default: m.AdminCategoriesPage })))
const AdminReviewDetail = lazy(() => import('@/features/admin/pages').then(m => ({ default: m.AdminReviewDetailPage })))
const AdminReports = lazy(() => import('@/features/admin/pages').then(m => ({ default: m.AdminReportsPage })))
const AdminSettlements = lazy(() => import('@/features/admin/pages').then(m => ({ default: m.AdminSettlementsPage })))
const AdminSettlementDetail = lazy(() => import('@/features/admin/pages').then(m => ({ default: m.AdminSettlementDetailPage })))

function Guard({ role }: { role: Role }) {
  const user = useSession(s => s.user)
  const location = useLocation()
  if (!user) return <Navigate replace to={'/auth/login?returnTo=' + encodeURIComponent(location.pathname + location.search)} />
  if (user.role !== role) return <Navigate replace to="/403" />
  return <Outlet />
}
export function AppRouter() {
  return <Suspense fallback={<LoadingState />}><Routes>
    <Route element={<TouristLayout />}>
      <Route index element={<Home />} />
      <Route path="/explore" element={<Explore />} /><Route path="/explore/:id" element={<DestinationDetail />} /><Route path="/destinations" element={<Explore />} /><Route path="/destinations/:id" element={<DestinationDetail />} />
      <Route path="/hotels" element={<Hotels />} /><Route path="/hotels/:id" element={<HotelDetail />} />
      <Route path="/ai/recommendations" element={<Recommendations />} /><Route path="/ai/trip-planner" element={<Planner />} /><Route path="/ai-planner" element={<Planner />} />
      <Route element={<Guard role="tourist" />}>
        <Route path="/profile" element={<Profile />} /><Route path="/preferences" element={<Preferences />} /><Route path="/favorites" element={<Favorites />} />
        <Route path="/trips" element={<Trips />} /><Route path="/trips/new" element={<TripForm />} /><Route path="/trips/:id" element={<TripDetail />} /><Route path="/trips/:id/edit" element={<TripForm />} />
        <Route path="/my-itineraries" element={<Trips />} /><Route path="/my-itineraries/new" element={<TripForm />} /><Route path="/my-itineraries/:id" element={<TripDetail />} /><Route path="/my-itineraries/:id/edit" element={<TripForm />} />
        <Route path="/bookings/new" element={<BookingNew />} /><Route path="/booking/checkout" element={<BookingCheckout />} /><Route path="/bookings" element={<Bookings />} /><Route path="/my-bookings" element={<Bookings />} /><Route path="/bookings/:id" element={<BookingDetail />} /><Route path="/my-bookings/:id" element={<BookingDetail />} /><Route path="/bookings/:id/payment" element={<Payment />} /><Route path="/booking/:id/payment" element={<Payment />} /><Route path="/bookings/:id/payment-result" element={<PaymentResult />} /><Route path="/booking/:id/payment-result" element={<PaymentResult />} /><Route path="/my-refunds" element={<MyRefunds />} />
      </Route>
      <Route path="/403" element={<NotFound forbidden />} /><Route path="*" element={<NotFound />} />
    </Route>
    <Route path="/auth" element={<AuthLayout />}><Route path="login" element={<Login />} /><Route path="register" element={<Register />} /><Route path="verify-otp" element={<VerifyOtp />} /><Route path="forgot-password" element={<ForgotPassword />} /><Route path="reset-password" element={<ResetPassword />} /></Route>
    <Route element={<AuthLayout />}><Route path="/login" element={<Login />} /><Route path="/register" element={<Register />} /><Route path="/forgot-password" element={<ForgotPassword />} /></Route>
    <Route element={<Guard role="partner" />}><Route path="/partner" element={<DashboardLayout kind="partner" />}>
      <Route index element={<Navigate replace to="dashboard" />} /><Route path="dashboard" element={<PartnerHome />} />
      <Route path="hotel" element={<PartnerHotel />} /><Route path="hotel/register" element={<PartnerHotelForm />} /><Route path="hotel/edit" element={<PartnerHotelForm />} /><Route path="hotel/:id/edit" element={<PartnerHotelForm />} />
      <Route path="rooms" element={<PartnerRooms />} /><Route path="rooms/new" element={<PartnerRoomForm />} /><Route path="rooms/:id" element={<PartnerRoomDetail />} /><Route path="rooms/:id/edit" element={<PartnerRoomForm />} />
      <Route path="amenities" element={<PartnerAmenities />} /><Route path="cancellation-policies" element={<PartnerCancellationPolicies />} /><Route path="media" element={<PartnerMedia />} />
      <Route path="bookings" element={<PartnerBookings />} /><Route path="bookings/:id" element={<PartnerBookingDetail />} /><Route path="booking-calendar" element={<PartnerBookingCalendar />} /><Route path="booking-history" element={<PartnerBookingHistory />} />
      <Route path="revenue" element={<PartnerRevenue />} /><Route path="payments" element={<PartnerPayments />} /><Route path="payouts" element={<PartnerPayouts />} /><Route path="refunds" element={<PartnerRefunds />} />
      <Route path="reviews" element={<PartnerReviews />} /><Route path="profile" element={<PartnerProfile />} />
    </Route></Route>
    <Route element={<Guard role="admin" />}><Route path="/admin" element={<DashboardLayout kind="admin" />}>
      <Route index element={<Navigate replace to="dashboard" />} /><Route path="dashboard" element={<AdminHome />} />
      <Route path="users" element={<AdminUsers />} /><Route path="users/:id" element={<AdminUserDetail />} />
      <Route path="hotels" element={<AdminHotels />} /><Route path="hotels/:id" element={<AdminHotelDetail />} />
      <Route path="destinations" element={<AdminDestinations />} /><Route path="destinations/new" element={<AdminDestinationForm />} /><Route path="destinations/:id/edit" element={<AdminDestinationForm />} />
      <Route path="topics" element={<AdminTopics />} />
      <Route path="bookings" element={<AdminBookings />} /><Route path="bookings/:id" element={<AdminBookingDetail />} />
      <Route path="payments" element={<AdminPayments />} /><Route path="payments/:id" element={<AdminPaymentDetail />} />
      <Route path="refunds" element={<AdminRefunds />} /><Route path="refunds/:id" element={<AdminRefundDetail />} />
      <Route path="payouts" element={<AdminPayouts />} /><Route path="payouts/:id" element={<AdminPayoutDetail />} />
      <Route path="reviews" element={<AdminReviewsModern />} /><Route path="reviews/:id" element={<AdminReviewDetail />} />
      <Route path="itineraries" element={<AdminItineraries />} /><Route path="itineraries/:id" element={<AdminItineraryDetail />} />
      <Route path="partners" element={<AdminPartners />} /><Route path="partners/:id" element={<AdminPartnerDetail />} /><Route path="services" element={<AdminServices />} /><Route path="service-categories" element={<AdminCategories />} /><Route path="reports" element={<AdminReports />} /><Route path="settlements" element={<AdminSettlements />} /><Route path="settlements/:id" element={<AdminSettlementDetail />} />
    </Route></Route>
  </Routes></Suspense>
}
