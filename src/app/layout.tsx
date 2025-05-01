import type { Metadata } from "next";
import { getSession } from "~/auth";
import "./globals.css";
import { Providers } from "./providers";

export const metadata: Metadata = {
  title: "Bitcoin Crazy Pong",
  description: "Play Pong against Satoshi Nakamoto!",
};

export default async function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  const session = await getSession();

  return (
    <html lang="en" className="dark">
      <body className="min-h-screen font-['Space_Mono'] bg-black text-white">
        <Providers session={session}>{children}</Providers>
      </body>
    </html>
  );
}
