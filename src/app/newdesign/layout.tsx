import type { Metadata } from "next";
import "./design-tokens.css";

export const metadata: Metadata = {
  title: "Glamour Girls of the Silver Screen",
  description: "Dedicated to the private lives of some of the most glamorous actresses of the Thirties, Forties, Fifties, and Sixties.",
};

export default function NewDesignLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  // This layout doesn't return html/body - that's handled by root layout
  // This just applies the design tokens CSS
  return <>{children}</>;
}

