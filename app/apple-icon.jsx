import { ImageResponse } from 'next/og';

export const size = { width: 180, height: 180 };
export const contentType = 'image/png';

export default function AppleIcon() {
  return new ImageResponse(
    (
      <div
        style={{
          alignItems: 'center',
          background: '#16372a',
          borderRadius: 40,
          color: '#f7fbf7',
          display: 'flex',
          fontFamily: 'Arial, sans-serif',
          fontSize: 48,
          fontWeight: 800,
          height: '100%',
          justifyContent: 'center',
          letterSpacing: -5,
          width: '100%',
        }}
      >
        i/o
      </div>
    ),
    { ...size },
  );
}
