import './globals.css';

export const metadata = {
  title: 'SARGE — Share the sun with The Gong',
  description: 'A Wollongong renewable-energy contribution prototype for donors, recipients, rewards and regional impact.',
  icons: {
    icon: [{ url: '/favicon.png?v=sarge-lightning-dark', sizes: '160x160', type: 'image/png' }],
    shortcut: ['/favicon.png?v=sarge-lightning-dark'],
    apple: [{ url: '/favicon.png?v=sarge-lightning-dark', sizes: '160x160', type: 'image/png' }],
  },
};

export default function RootLayout({ children }) { return <html lang="en"><body>{children}</body></html>; }
