import './globals.css';
import type { Metadata } from 'next';

export const metadata: Metadata = {
  title: 'Zynext Counter — Kredit Elektronik',
  description: 'Aplikasi manajemen klien kredit elektronik responsif untuk Zynext Counter.',
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="id">
      <body>{children}</body>
    </html>
  );
}
