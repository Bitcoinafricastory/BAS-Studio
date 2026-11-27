import type { OutputId } from "./types";
import { THREAD_LINES } from "./registry";

// Few-shot examples for the generator. The main posts and the archive post are condensed
// from the editor's approved Premium-length posts so they fit 280 characters, keeping only
// their own facts. The requote lines are Destiny's approved lines from the requote chat,
// with the house closing line. Replace any of these with real approved posts as they go out.
// Reply 1 has no examples: Studio writes it from fixed wording.

export interface Example {
  article: string;
  text: string;
}

export const EXAMPLES: Partial<Record<OutputId, Example[]>> = {
  x_bas_post: [
    {
      article: "Btrust Skips 2026 Developer Day, Teases Btrust Dev Con 2027",
      text: `No Btrust Developer Day this year. @btrustteam held the first in Nairobi in 2024 and the second in Mauritius in 2025, and this December's conference in Blantyre runs without one.

CEO @ihate1999 has hinted at a new name: Btrust Dev Con 2027.

${THREAD_LINES.mainPostEnd}`,
    },
    {
      article: "From Mauritius to El Zonte: Africa's Bitcoin Circular Economies Summit",
      text: `In December 2025, leaders of more than a dozen Bitcoin circular economies across Africa met in Mauritius, including @BitcoinEkasi, @afribitkibera and @btcshule.

@zackdorseyx filmed it, and the clips are coming out now.

${THREAD_LINES.mainPostEnd}`,
    },
  ],
  x_author_post: [
    {
      article: "Africa Bitcoin Conference 2026, Blantyre",
      text: `Africa's longest-running Bitcoin conference @AfroBitcoinOrg hits its 5th edition in a new city.

${THREAD_LINES.requoteEnd}`,
    },
    {
      article: "A Gorilla Sats event",
      text: `Hosted by @GorillaSats. 18 spots. 0.056 BTC.

${THREAD_LINES.requoteEnd}`,
    },
  ],
  li_bas_post: [
    {
      article: "Btrust Skips 2026 Developer Day, Teases Btrust Dev Con 2027",
      text: `Btrust won't hold a Developer Day in 2026.

The first was in Nairobi in December 2024, with more than 250 developers, builders and open-source contributors. The second was in Mauritius in December 2025, free to attend, under the theme "Build Locally, Contribute Globally." Both opened the Africa Bitcoin Conference with a day built around African developers.

This year's conference runs December 2 to 5 in Blantyre, Malawi, without one.

Btrust says it's using the time to "listen, reflect, and prepare for a bigger next chapter in 2027." A few hours after the announcement, CEO Abubakar Nur Khalil hinted at a new name: Btrust Dev Con 2027. Btrust hasn't confirmed the format, date or city yet.

Jack Dorsey and Jay-Z founded Btrust in 2021 with 500 BTC. It funds, trains and pays Bitcoin open-source developers across the Global South.

Read the full story by Destiny Smart: https://www.bitcoinafricastory.com/news/btrust-dev-con-2027-developer-day

#Bitcoin #Africa #OpenSource #BitcoinDevelopers`,
    },
  ],
  x_archive: [
    {
      article: "The Core Takes Bitcoin Education to a Kenyan University Campus",
      text: `Felix Mukungu (@MukunguFelix) lost money to crypto scams before he ever taught Bitcoin. Then he shared a nine-chapter course in a WhatsApp group.

That course grew into The Core (@thecore21m), and 643 people have finished its diploma so far.

${THREAD_LINES.mainPostEnd}`,
    },
  ],
};
