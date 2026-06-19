import type { Metadata } from "next";
import { Inter } from "next/font/google";
import "./globals.css";
import NextTopLoader from "nextjs-toploader";
import { Toaster } from "sonner";
import IntlProvider from './_providers/IntlProvider';
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

const LOCALES = ['fr', 'en', 'es', 'de', 'it', 'nl', 'pt'] as const;
type Locale = typeof LOCALES[number];
const DEFAULT_LOCALE: Locale = 'fr';

async function getLocaleAndMessages() {
  let locale: Locale = DEFAULT_LOCALE;
  try {
    const cookieStore = await cookies();
    const v = cookieStore.get('locale')?.value as Locale | undefined;
    if (v && (LOCALES as readonly string[]).includes(v)) locale = v;
  } catch { /* prerendering — no cookies */ }
  try {
    const messages = (await import(`../messages/${locale}.json`)).default;
    return { locale, messages };
  } catch {
    const messages = (await import('../messages/fr.json')).default;
    return { locale: DEFAULT_LOCALE, messages };
  }
}

export default async function RootLayout({
  children,
}: Readonly<{ children: React.ReactNode }>) {
  const { locale, messages } = await getLocaleAndMessages();

  return (
    <html lang={locale} className={`${inter.variable} h-full antialiased`}>
      <body className="min-h-full flex flex-col font-[family-name:var(--font-inter)]">
        <NextTopLoader color="#6366F1" height={2} showSpinner={false} />
        <Toaster position="bottom-right" richColors />
        <IntlProvider locale={locale} messages={messages}>
          {children}
        </IntlProvider>
      </body>
    </html>
  );
}
