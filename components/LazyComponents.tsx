// components/LazyComponents.tsx
// Lazy load heavy components for better performance

import dynamic from 'next/dynamic'

// Lazy load heavy feature pages
export const ApiEndpointsPage = dynamic(
  () => import('./ApiEndpointsPage'),
  {
    loading: () => (
      <div className="flex items-center justify-center min-h-screen">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-purple-600 mx-auto mb-4"></div>
          <p className="text-gray-600">Loading API Endpoints...</p>
        </div>
      </div>
    ),
    ssr: false
  }
)

export const EnvironmentVariablesPage = dynamic(
  () => import('./EnvironmentVariablesPage'),
  {
    loading: () => (
      <div className="flex items-center justify-center min-h-screen">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600 mx-auto mb-4"></div>
          <p className="text-gray-600">Loading Environment Variables...</p>
        </div>
      </div>
    ),
    ssr: false
  }
)

export const EnhancedDashboard = dynamic(
  () => import('./EnhancedDashboard'),
  {
    loading: () => (
      <div className="flex items-center justify-center min-h-screen">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-green-600 mx-auto mb-4"></div>
          <p className="text-gray-600">Loading Dashboard...</p>
        </div>
      </div>
    ),
    ssr: false
  }
)

export const AnalyticsDashboard = dynamic(
  () => import('./AnalyticsDashboard'),
  {
    loading: () => (
      <div className="flex items-center justify-center min-h-screen">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-indigo-600 mx-auto mb-4"></div>
          <p className="text-gray-600">Loading Analytics...</p>
        </div>
      </div>
    ),
    ssr: false
  }
)

export const PricingPage = dynamic(
  () => import('./PricingPage'),
  {
    loading: () => (
      <div className="flex items-center justify-center min-h-screen">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-purple-600 mx-auto mb-4"></div>
          <p className="text-gray-600">Loading Pricing...</p>
        </div>
      </div>
    ),
    ssr: true // Keep SSR for pricing page (SEO important)
  }
)

// Heavy modals - lazy load them
export const ApiEndpointsModals = dynamic(
  () => import('./ApiEndpointsModals').then(mod => ({
    default: mod.CreateEndpointModal
  })),
  {
    loading: () => <div className="animate-pulse">Loading modal...</div>,
    ssr: false
  }
)

export const CodeViewModal = dynamic(
  () => import('./ApiEndpointsModals').then(mod => ({
    default: mod.CodeViewModal
  })),
  {
    loading: () => <div className="animate-pulse">Loading code viewer...</div>,
    ssr: false
  }
)

// Workspace components - heavy due to table and member management
export const WorkspaceMembersList = dynamic(
  () => import('./WorkspaceMembersList').then(mod => ({ default: mod.WorkspaceMembersList })),
  {
    loading: () => (
      <div className="space-y-3 animate-pulse">
        {[1, 2, 3].map(i => (
          <div key={i} className="border border-gray-200 dark:border-gray-700 rounded-lg p-4">
            <div className="h-4 bg-gray-200 dark:bg-gray-700 rounded w-1/3 mb-3"></div>
            <div className="h-3 bg-gray-200 dark:bg-gray-700 rounded w-1/4"></div>
          </div>
        ))}
      </div>
    ),
    ssr: false
  }
)

export const InviteMemberDialog = dynamic(
  () => import('./InviteMemberDialog').then(mod => ({ default: mod.InviteMemberDialog })),
  {
    loading: () => null, // Dialog is triggered by user, no loading needed
    ssr: false
  }
)

// Export all for easy importing
const LazyComponents = {
  ApiEndpointsPage,
  EnvironmentVariablesPage,
  EnhancedDashboard,
  AnalyticsDashboard,
  PricingPage,
  ApiEndpointsModals,
  CodeViewModal,
  WorkspaceMembersList,
  InviteMemberDialog,
}

export default LazyComponents
