import type { OutputId } from "./types";

// Approved examples from the editor, used as few-shot examples in the generator prompt.
// The Btrust BAS post originally ended without the 👇; it is added here so every example
// matches the template and the length/required-parts checks.
const BTRUST_URL = "https://www.bitcoinafricastory.com/news/btrust-dev-con-2027-developer-day";

export interface Example {
  article: string;
  text: string;
}

export const EXAMPLES: Partial<Record<OutputId, Example[]>> = {
  x_bas_post: [
    {
      article: "Btrust Skips 2026 Developer Day, Teases Btrust Dev Con 2027",
      text: `No Btrust Developer Day this year.

@btrustteam held the first in Nairobi in 2024 and the second in Mauritius in 2025. Both opened the Africa Bitcoin Conference with a day built around African developers, and more than 250 came to the first.

This December, the conference runs in Blantyre, Malawi, without one.

Btrust says it's using the time to "listen, reflect, and prepare for a bigger next chapter in 2027."

A few hours later, CEO @ihate1999 hinted at a new name: Btrust Dev Con 2027.

Check the first comment to read the full story. 👇`,
    },
    {
      article: "From Mauritius to El Zonte: Africa's Bitcoin Circular Economies Summit",
      text: `In December 2025, leaders of more than a dozen Bitcoin circular economies across Africa sat in one room for the first time.

Each had taken the model @Bitcoinbeach started in El Zonte, El Salvador, and adapted it to their own community. Bitcoin Beach's report names 15 projects from nine countries, including Bitcoin Ekasi (@BitcoinEkasi) in a Mossel Bay township, Afribit Kibera (@afribitkibera) in Nairobi and BTC Shule (@btcshule) in a village in Burundi.

They met in Mauritius because visa, travel and financial barriers keep many African builders out of global Bitcoin events.

@zackdorseyx filmed it. The clips are coming out now, including @thecoachayobami of @BitKwaofficial and @BrindonMwiine of @BitcoinKampala.

Next stop: the Global Bitcoin Circular Economies Summit in El Zonte, November 19 and 20, open to the public for the first time.

Check the first comment to read the full story. 👇`,
    },
  ],
  x_bas_comment: [
    {
      article: "Btrust Skips 2026 Developer Day, Teases Btrust Dev Con 2027",
      text: `Btrust hasn't confirmed the format, date or city for Dev Con 2027. Here's what we know so far.

Read the full story by @Destinysmart_ 👇
${BTRUST_URL}`,
    },
    {
      article: "From Mauritius to El Zonte: Africa's Bitcoin Circular Economies Summit",
      text: `Read the full story by @Destinysmart_ 👇
https://www.bitcoinafricastory.com/news/africa-bitcoin-circular-economies-mauritius-el-zonte`,
    },
    {
      article: "The Core Takes Bitcoin Education to a Kenyan University Campus (follows earlier coverage)",
      text: `Read our latest story on The Core by @Destinysmart_ 👇
https://www.bitcoinafricastory.com/news/the-core-takes-bitcoin-education-to-a-kenyan-university-campus`,
    },
  ],
  x_author_post: [
    {
      article: "Btrust Skips 2026 Developer Day, Teases Btrust Dev Con 2027",
      text: `In my latest for @btcafricastory, I covered why @btrustteam is skipping its Developer Day this year, after Nairobi in 2024 and Mauritius in 2025.

CEO @ihate1999 has already hinted at what's next: Btrust Dev Con 2027.

${BTRUST_URL}`,
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

Read the full story by Destiny Smart: ${BTRUST_URL}

#Bitcoin #Africa #OpenSource #BitcoinDevelopers`,
    },
  ],
  x_archive: [
    {
      article: "The Core Takes Bitcoin Education to a Kenyan University Campus",
      text: `Felix Mukungu (@MukunguFelix) lost money to crypto scams before he ever taught Bitcoin.

Then he started sharing a nine-chapter Bitcoin course in a WhatsApp group.

That course grew into The Core (@thecore21m). Today it runs a free Bitcoin Diploma on the @MyFirstBitcoin_ curriculum. Four intakes a year. 24 sessions each. Every graduate leaves with a certificate and 500 sats.

The first cohort graduated 10 people. The sixth graduated 137.

643 have finished it so far, 520 of them from Kenya. The rest come from 27 other countries, from Zambia and Nigeria to the USA, Canada and Afghanistan.

Some graduates started new projects. Others took what they learned back to projects they already ran. Among them: @bitcoingithurai, @BitcoinSchoolKe, @EcoBitz_21m, @btcafricastory and Yes Bitcoin Haiti.

In Githurai, the Nairobi settlement where Felix once lived, The Core has onboarded 16 merchants. Boda riders, food vendors and shops. Students travel there to spend their sats.

Some days the merchants see zero payments. Some days they see nine.

In April, The Core's unconference in Nairobi drew more than 500 people. About 80% were youth. 18 local projects presented.

It started in a WhatsApp group.

It doesn't have to be perfect at first. Keep building.`,
    },
  ],
};
