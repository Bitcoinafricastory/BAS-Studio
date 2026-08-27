import type { Metadata } from "next";
import { Montserrat, Poppins, Inter, Merriweather } from "next/font/google";
import "./globals.css";
import PasscodeGate from "@/components/ui/PasscodeGate";
import IconRail from "@/components/ui/IconRail";

const montserrat = Montserrat({
  subsets: ["latin"],
  variable: "--font-montserrat",
  weight: ["400", "500", "600", "700"],
});

// Additional fonts the StoryEditor's font dropdown offers — matches the main site's set.
const poppins = Poppins({ subsets: ["latin"], weight: "400", variable: "--font-poppins" });
const inter = Inter({ subsets: ["latin"], weight: "400", variable: "--font-inter" });
const merriweather = Merriweather({ subsets: ["latin"], weight: "400", variable: "--font-merriweather" });

export const metadata: Metadata = {
  title: "BAS Studio",
  description: "Internal drafting tool for Bitcoin Africa Story",
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="en" className={`${montserrat.variable} ${poppins.variable} ${inter.variable} ${merriweather.variable}`}>
      <body className="font-sans min-h-screen bg-black text-gray-50">
        <PasscodeGate>
          <div className="flex min-h-screen">
            <IconRail />
            <main className="flex-1 min-w-0">{children}</main>
          </div>
        </PasscodeGate>
      </body>
    </html>
  );
}
