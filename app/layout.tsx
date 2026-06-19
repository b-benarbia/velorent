import type { Metadata } from "next";
import { Inter } from "next/font/google";
import "./globals.css";
import NextTopLoader from "nextjs-toploader";
import { Toaster } from "sonner";
import { NextIntlClientProvider } from 'next-intl';
import { getLocale, getMessages } from 'next-intl/server';

const inter = Inter({
  variable: "--font-inter",
  subsets: ["latin"],
  display: "swap",
});

export const metadata: Metadata = {
  title: "VeloRent",
  description: "Gestion de location de vélos",
};

export default async function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  // Fallback during static prerendering (/_not-found) where no request context exists
  let locale = 'fr'
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  let messages: any = {}
  try {
    locale = await getLocale()
    messages = await getMessages()
  } catch {
    messages = (await import('../messages/fr.json')).default
  }

  return (
    <html lang={locale} className={`${inter.variable} h-full antialiased`}>
      <body className="min-h-full flex flex-col font-[family-name:var(--font-inter)]">
        <NextTopLoader color="#6366F1" height={2} showSpinner={false} />
        <Toaster position="bottom-right" richColors />
        <NextIntlClientProvider messages={messages}>
          {children}
        </NextIntlClientProvider>
      </body>
    </html>
  );
}
