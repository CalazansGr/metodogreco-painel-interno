import './globals.css';

export const metadata = { title: 'Método Greco', description: 'Agenda e gestão de aulas do Método Greco' };

export default function RootLayout({ children }) {
  return (
    <html lang="pt-BR">
      <body>{children}</body>
    </html>
  );
}
