import { ImageResponse } from 'next/og'

// Route segment config
export const runtime = 'edge'

// Image metadata
export const size = {
  width: 180,
  height: 180,
}
export const contentType = 'image/png'

// Image generation - Apple Touch Icon (180x180)
export default function AppleIcon() {
  return new ImageResponse(
    (
      <div
        style={{
          fontSize: 100,
          background: 'linear-gradient(135deg, #8B5CF6 0%, #EC4899 100%)',
          width: '100%',
          height: '100%',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          borderRadius: '36px',
          color: 'white',
          fontWeight: 'bold',
          fontFamily: 'system-ui, -apple-system, sans-serif',
        }}
      >
        B
      </div>
    ),
    {
      ...size,
    }
  )
}


