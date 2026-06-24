import "./globals.css";

export const metadata = {
  title: "Splendor",
  description: "Simple Splendor board UI prototype",
};

export default function RootLayout({ children }) {
  return (
    <html lang="vi">
      <body>{children}</body>
    </html>
  );
}
