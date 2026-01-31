import { ImageResponse } from 'next/og'

export const runtime = 'edge'

export const size = {
  width: 1200,
  height: 630,
}

export const contentType = 'image/png'

export default async function Image() {
  return new ImageResponse(
    (
      <div
        style={{
          height: '100%',
          width: '100%',
          display: 'flex',
          flexDirection: 'column',
          alignItems: 'center',
          justifyContent: 'center',
          backgroundColor: '#0a0a0a',
          backgroundImage: 'radial-gradient(circle at 25px 25px, #1a1a1a 2%, transparent 0%), radial-gradient(circle at 75px 75px, #1a1a1a 2%, transparent 0%)',
          backgroundSize: '100px 100px',
        }}
      >
        {/* Gradient overlay */}
        <div
          style={{
            position: 'absolute',
            top: 0,
            left: 0,
            right: 0,
            bottom: 0,
            background: 'linear-gradient(135deg, rgba(99, 102, 241, 0.1) 0%, rgba(168, 85, 247, 0.1) 100%)',
          }}
        />

        {/* Content container */}
        <div
          style={{
            display: 'flex',
            flexDirection: 'column',
            alignItems: 'center',
            justifyContent: 'center',
            padding: '80px',
            zIndex: 1,
          }}
        >
          {/* Logo/Icon */}
          <div
            style={{
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              width: '120px',
              height: '120px',
              borderRadius: '30px',
              background: 'linear-gradient(135deg, #6366f1 0%, #a855f7 100%)',
              marginBottom: '40px',
              boxShadow: '0 20px 60px rgba(99, 102, 241, 0.4)',
            }}
          >
            <svg
              width="70"
              height="70"
              viewBox="0 0 24 24"
              fill="none"
              xmlns="http://www.w3.org/2000/svg"
            >
              <path
                d="M8 3L4 7L8 11M16 3L20 7L16 11M12 3V21M4 13L8 17L4 21M20 13L16 17L20 21"
                stroke="white"
                stroke-width="2"
                stroke-linecap="round"
                stroke-linejoin="round"
              />
            </svg>
          </div>

          {/* Title */}
          <div
            style={{
              display: 'flex',
              fontSize: '72px',
              fontWeight: 'bold',
              background: 'linear-gradient(135deg, #ffffff 0%, #e0e7ff 100%)',
              backgroundClip: 'text',
              color: 'transparent',
              marginBottom: '20px',
              letterSpacing: '-0.02em',
            }}
          >
            BuildFlow
          </div>

          {/* Subtitle */}
          <div
            style={{
              display: 'flex',
              fontSize: '36px',
              color: '#a5b4fc',
              marginBottom: '30px',
              fontWeight: 500,
            }}
          >
            AI-Powered Code Generation
          </div>

          {/* Description */}
          <div
            style={{
              display: 'flex',
              fontSize: '24px',
              color: '#9ca3af',
              textAlign: 'center',
              maxWidth: '900px',
              lineHeight: 1.4,
            }}
          >
            Generate production-ready React components and web apps in seconds
          </div>

          {/* Badge */}
          <div
            style={{
              display: 'flex',
              marginTop: '40px',
              padding: '12px 30px',
              borderRadius: '50px',
              background: 'rgba(99, 102, 241, 0.2)',
              border: '2px solid rgba(99, 102, 241, 0.3)',
              fontSize: '20px',
              color: '#c7d2fe',
              fontWeight: 600,
            }}
          >
            ⚡ No Coding Required
          </div>
        </div>

        {/* Bottom accent line */}
        <div
          style={{
            position: 'absolute',
            bottom: 0,
            left: 0,
            right: 0,
            height: '6px',
            background: 'linear-gradient(90deg, #6366f1 0%, #a855f7 100%)',
          }}
        />
      </div>
    ),
    {
      ...size,
    }
  )
}
