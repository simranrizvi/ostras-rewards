import './globals.css';

export const metadata = {
  title: 'Ostras Rewards — Turn product checks into rewards',
  description: 'Upload a product photo, check its expiry date, and track your Ostras rewards.',
};

export default function RootLayout({ children }) {
  return <html lang="en"><body>{children}</body></html>;
}
