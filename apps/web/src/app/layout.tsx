import type { Metadata } from "next";

export const metadata: Metadata = {
  title: "Midgard",
  description: "Midgard web application",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en">
      <body>{children}</body>
    </html>
  );
}
