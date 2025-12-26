import PropTypes from 'prop-types';
import { Open_Sans } from 'next/font/google';

// CSS
import './globals.css';

// Auth Provider
import { AuthProvider } from '@/contexts/AuthContext';

// Fonts
const fontOpenSans = Open_Sans({
  subsets: ['latin'],
  style: 'normal',
  weight: ['300', '400', '500', '600', '700']
});

export const metadata = {
  title: 'Nurse Note AI - 看護記録管理システム',
  description: '看護記録をスマートに管理し、患者ケアの質を向上させます'
};

export default function RootLayout({ children }) {
  return (
    <html lang="ja">
      <body className={`${fontOpenSans.className} antialiased`}>
        <AuthProvider>{children}</AuthProvider>
      </body>
    </html>
  );
}

RootLayout.propTypes = { children: PropTypes.any };
