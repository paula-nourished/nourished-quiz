import "./globals.css";
import { Figtree } from "next/font/google";

const figtree = Figtree({ subsets: ["latin"] });

export const metadata = {
  title: "Nourished Quiz",
  description: "Boots iframe + kiosk quiz",
};

export default function RootLayout({ children }) {
  return (
    <html lang="en">
      <body className={figtree.className}>
        {children}
      </body>
    </html>
  );
}