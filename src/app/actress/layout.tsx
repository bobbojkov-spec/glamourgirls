import type { Metadata } from "next";
import "../newdesign/design-tokens.css";

export const metadata: Metadata = {
  title: "Glamour Girls of the Silver Screen",
  description: "Dedicated to the private lives of some of the most glamorous actresses of the Thirties, Forties, Fifties, and Sixties.",
};

export default function ActressLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  // This layout applies the design tokens CSS for actress pages
  return <>{children}</>;
}

