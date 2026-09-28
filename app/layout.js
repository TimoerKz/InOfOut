import './styles.css';

export const metadata = {
  title: 'InOfOut',
  description: 'Samen plannen, zonder gedoe.',
};

export default function RootLayout({ children }) {
  return <html lang="nl"><body>{children}</body></html>;
}
