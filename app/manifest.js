export default function manifest() {
  return {
    name: 'InOfOut — groepsagenda',
    short_name: 'InOfOut',
    description: 'Samen plannen, zonder gedoe.',
    start_url: '/',
    display: 'standalone',
    background_color: '#f6f8f5',
    theme_color: '#173829',
    icons: [
      {
        src: '/icon.svg',
        sizes: 'any',
        type: 'image/svg+xml',
        purpose: 'any maskable',
      },
    ],
  };
}
