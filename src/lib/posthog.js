import posthog from 'posthog-js'

// Initialize PostHog
const posthogInit = () => {
  posthog.init(
    import.meta.env.VITE_POSTHOG_KEY,
    {
      api_host: import.meta.env.VITE_POSTHOG_HOST,
      autocapture: true,
      capture_pageview: true,
      capture_pageleave: true,
      disable_session_recording: false,
      persistence: 'localStorage',
      bootstrap: {
        distinctID: 'desktopddpptx.vercel.app',
        isIdentifiedID: true
      },
      api_host: 'https://us.posthog.com'
    }
  )
}

export { posthogInit, posthog } 