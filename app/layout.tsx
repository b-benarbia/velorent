import type { Metadata } from "next";
import { Inter } from "next/font/google";
import "./globals.css";
import NextTopLoader from "nextjs-toploader";
import { Toaster } from "sonner";
import { NextIntlClientProvider } from 'next-intl';
import { getMessages, setRequestLocale } from 'next-intl/server';
import { cookies } from 'next/headers';

const inter = Inter({
  variable: "--font-inter",
  subsets: ["latin"],
  display: "swap",
});

export const metadata: Metadata = {
  title: "VeloRent",
  description: "Gestion de location de vélos",
};

const LOCALES = ['fr', 'en', 'es', 'de', 'it', 'nl', 'pt'];
const DEFAULT_LOCALE = 'fr';

export default async function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  // Read locale from cookie directly (bypasses next-intl request context issue)
  let locale = DEFAULT_LOCALE;
  try {
    const cookieStore = await cookies();
    const cookieLocale = cookieStore.get('locale')?.value;
    if (cookieLocale && LOCALES.includes(cookieLocale)) {
      locale = cookieLocale;
    }
  } catch {
    // No cookie context during static prerendering
  }

  // MUST be called before any other next-intl server function
  setRequestLocale(locale);

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  let messages: any = {};
  try {
    messages = await getMessages();
  } catch {
    messages = (await import(`../messages/${locale}.json`)).default;
  }

  return (
    <html lang={locale} className={`${inter.variable} h-full antialiased`}>
      <body className="min-h-full flex flex-col font-[family-name:var(--font-inter)]">
        <NextTopLoader color="#6366F1" height={2} showSpinner={false} />
        <Toaster position="bottom-right" richColors />
        <NextIntlClientProvider locale={locale} messages={messages}>
          {children}
        </NextIntlClientProvider>
      </body>
    </html>
  );
}
