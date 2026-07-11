import type { Metadata } from "next";
import "./globals.css";
import "./product.css";

const title = "Adherence OS | Explainable at-home adherence support";
const description =
  "A graph-first GLP-1 adherence prototype that combines local ML attribution, bounded support routes, and deterministic clinical safety handoff.";

export const metadata: Metadata = {
  metadataBase: new URL(process.env.NEXT_PUBLIC_SITE_URL ?? "http://localhost:3000"),
  title,
  description,
  applicationName: "Adherence OS",
  openGraph: {
    title,
    description,
    type: "website",
    siteName: "Adherence OS",
    images: [
      {
        url: "/adherence-os-live-twin.jpg",
        width: 1280,
        height: 720,
        alt: "Adherence OS Live twin showing an explainable synthetic adherence-risk graph"
      }
    ]
  },
  twitter: {
    card: "summary_large_image",
    title,
    description,
    images: ["/adherence-os-live-twin.jpg"]
  }
};

export default function RootLayout({
  children
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en">
      <body>{children}</body>
    </html>
  );
}
