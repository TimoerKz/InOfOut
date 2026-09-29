import './styles.css';
import './refinement.css';
import SiteFooter from './site-footer';
import PwaRegister from './pwa-register';

export const metadata = {
  title: 'InOfOut',
  description: 'Samen plannen, zonder gedoe.',
  manifest: '/manifest.webmanifest',
  icons: {
    icon: [{ url: '/icon.svg', type: 'image/svg+xml' }],
    apple: [{ url: '/apple-icon', sizes: '180x180', type: 'image/png' }],
  },
  appleWebApp: {
    capable: true,
    statusBarStyle: 'default',
    title: 'InOfOut',
  },
};

export default function RootLayout({ children }) {
  return <html lang="nl"><body><PwaRegister />{children}<SiteFooter /></body></html>;
}
