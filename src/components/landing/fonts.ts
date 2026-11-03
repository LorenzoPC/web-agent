import { JetBrains_Mono, Oxanium, Sora } from "next/font/google";

// Open source (SIL OFL) variable fonts for the landing theme. Each sets the CSS
// variable that globals.css maps to font-display, font-body and font-label.
const oxanium = Oxanium({ variable: "--font-oxanium", subsets: ["latin"] });
const sora = Sora({ variable: "--font-sora", subsets: ["latin"] });
const jetbrainsMono = JetBrains_Mono({ variable: "--font-jetbrains-mono", subsets: ["latin"] });

/** Put on a page's root element to make the landing fonts available inside it. */
export const LANDING_FONT_VARIABLES = `${oxanium.variable} ${sora.variable} ${jetbrainsMono.variable}`;
