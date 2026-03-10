import { Inter } from 'next/font/google';
import './globals.css';

const inter = Inter({ subsets: ['latin'] });

export const metadata = {
  title: 'DevTools Hub',
  description: 'A collection of useful developer tools.',
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="en" className={inter.className}>
      <body className="bg-gray-50 text-gray-900 min-h-screen flex flex-col">
        {children}
      </body>
    </html>
  );
}
