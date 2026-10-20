// Approved BAS writing, taken from articles the editor signed off on, plus the corrections
// the editor made along the way. Used as few-shot material in every article prompt.
// Add to these as new articles are approved; the prompts pick them up automatically.

export interface Lede {
  article: string;
  url: string;
  text: string; // hook + intro + read-through line, exactly as approved
}

export const APPROVED_LEDES: Lede[] = [
  {
    article: "Inside the Circular Bitcoin Africa Fund (CBAF)",
    url: "https://www.bitcoinafricastory.com/news/inside-the-circular-bitcoin-africa-fund-cbaf",
    text: `4,853. That's how many bitcoin payments at African shops were filmed and approved between May 2025 and July 2026.

Anyone can post about Bitcoin adoption on X. Showing that people actually spend bitcoin at local shops takes more. The Circular Bitcoin Africa Fund (CBAF), an informal network of about 40 Bitcoin circular economies across Africa, asks its projects for that proof, and PoWBoT, a bot built by Bitcoin Ubuntu, checks it.

Here's how CBAF started, why its projects stay small, how PoWBoT checks each payment and what the numbers show so far.`,
  },
  {
    article: "Dada Devs Alumna Susan Githaiga Lands Code in Open-Source Bitcoin Mining Firmware Mujina",
    url: "https://www.bitcoinafricastory.com/news/susan-githaiga-mujina-bitcoin-mining-firmware",
    text: `On August 31, Ryan Kuester merged a small change from Susan Githaiga into Mujina, the open-source Bitcoin mining firmware he designs and maintains. It removed an outside software library the firmware no longer needed. Dada Devs, where she trained, celebrated her on October 9 "for becoming the first African contributor to the 256 Foundation's mining project."

On October 1, the 256 Foundation, which funds Mujina, had already named her among five people who "landed code this term, most of them for the first time."

Here's what Susan changed, what Mujina does for miners and where she learned to build for Bitcoin.`,
  },
  {
    article: "Btrust Skips Its 2026 Developer Day, Teases Btrust Dev Con 2027",
    url: "https://www.bitcoinafricastory.com/news/btrust-dev-con-2027-developer-day",
    text: `Btrust won't hold a Developer Day in 2026. In a post on X on October 15, the Bitcoin developer nonprofit said it is "using this time to listen, reflect, and prepare for a bigger next chapter in 2027." The post's image shows an empty, red-lit stage under the words "Bigger stage. Bolder conversations. Coming soon."

A few hours later, Btrust CEO Abubakar Nur Khalil shared the announcement with a hint at a new name: "Btrust Dev Con 2027 > Btrust Dev Day. More updates soon."

Here's what the first two Developer Days delivered, what Btrust does for African developers and what's known about 2027 so far.`,
  },
  {
    article: "From Mauritius to El Zonte: Africa's Bitcoin Circular Economies Summit",
    url: "https://www.bitcoinafricastory.com/news/africa-bitcoin-circular-economies-mauritius-el-zonte",
    text: `In December 2025, leaders from more than a dozen Bitcoin circular economies across Africa sat in the same room for the first time. Each had taken the model Bitcoin Beach started in El Zonte, El Salvador, and made it work at home.

Here's who was in the room, how their projects work and where the conversation goes next.`,
  },
];

// Section headings the editor approved. They describe the section and carry the key name.
export const APPROVED_HEADINGS: string[] = [
  "How the Circular Bitcoin Africa Fund Started",
  "Why CBAF Projects Stay Small",
  "How PoWBoT Checks Each Payment",
  "How CBAF Has Grown",
  "How Susan Githaiga Improved Mujina's Code",
  "What Is Mujina? The 256 Foundation's Open-Source Bitcoin Mining Firmware",
  "Dada Devs: Training Africa's First Generation of Female Bitcoin Developers",
  "Dada Devs Alumni Contributing to Bitcoin Core, Lightning and Open Source",
  "Btrust Developer Day 2024 and 2025: Nairobi and Mauritius",
  "What Btrust Does for African Bitcoin Developers",
  "What We Know About Btrust Dev Con 2027",
  "Africa Bitcoin Circular Economies Summit in Mauritius: Who Was There",
  "How African Projects Adapted the El Zonte Model",
  "Next: The Global Bitcoin Circular Economies Summit in El Zonte",
];

// Approved body paragraphs that show how BAS explains, attributes and links.
export const APPROVED_PARAGRAPHS: string[] = [
  `Firmware is the layer that talks to a miner's chips, and on almost every machine shipping today it is closed. "You cannot prove it is not skimming your hashrate or phoning home to a license server for permission to mine," the 256 Foundation writes. Mujina is meant to replace that with one open codebase that runs hashboards from any vendor, with no dev fee. It is written in Rust and released under the GPL.`,
  `PoWBoT calls each round an epoch. The first three were checked by hand and brought in 81, 298 and 604. After the bot took over, Epoch 4 (December 2025 to March 2026) reached 1,885. Epoch 5 (March to July 2026) had 1,985, from 22 projects and 156 merchants in seven countries. PoWBoT's archive notes that the totals aren't a like-for-like comparison, because the rules changed between epochs.`,
  `Btrust hasn't announced a date, city or format for 2027. Its post ends with "More details are coming soon. Watch this space." Khalil's post calls the 2027 event "Btrust Dev Con" instead of "Dev Day," which hints at a full conference rather than a one-day event. Btrust hasn't confirmed the format.`,
  `In Burundi, BTC Shule has shops and a hotel in Winteko village taking Lightning payments. These are only a few. Other projects use similar or different approaches, depending on what has worked for their communities. No single model fits every place, so each project has to adapt it at some point.`,
];

// Real corrections from the editor, with the rule behind each one.
export const EDITOR_LESSONS: { draft: string; fix: string; rule: string }[] = [
  { draft: "Used material from a private chat.", fix: "Removed all of it, and any mention of where it came from.", rule: "Never use private chat content or mention private groups." },
  { draft: "Repeated a claim from a third-party page that the editor knew was wrong.", fix: "Removed the claim.", rule: "The editor's own knowledge outranks a third-party page." },
  { draft: "Intro and sections restated the same facts.", fix: "Each fact kept once.", rule: "Say each thing once." },
  { draft: "Headings like \"The Numbers So Far\" and \"What the Videos Miss\".", fix: "\"How CBAF Has Grown\", \"How PoWBoT Checks Each Payment\".", rule: "Headings describe the section and carry the key name." },
  { draft: "Intro opened on general context.", fix: "A one-line number hook, then the concrete story, then a read-through line.", rule: "Lead with a concrete fact or story and preview the sections." },
  { draft: "Named one project in the intro without a reason.", fix: "Removed; the intro stays on the story itself.", rule: "Every name in the intro must earn its place." },
  { draft: "\"These projects belong to CBAF.\"", fix: "\"Many of these projects are also part of the Circular Bitcoin Africa Fund.\"", rule: "Use exact relationship words." },
  { draft: "\"All the projects attended.\"", fix: "\"Most\" attended; others could not.", rule: "No absolutes unless the source says so." },
  { draft: "Merged a 2024 grant round and the current round into one sentence.", fix: "Kept the two periods apart.", rule: "Never merge different time periods into one claim." },
  { draft: "\"CEO posted a new name: Btrust Dev Con 2027.\"", fix: "\"hinted at a new name\".", rule: "Keep the source's certainty." },
  { draft: "\"He responded by founding The Core.\"", fix: "\"lost money to crypto scams before he ever taught Bitcoin.\"", rule: "No causes the source does not state." },
  { draft: "Three projects named as if they were the full list.", fix: "\"Bitcoin Beach's report names 15 projects from nine countries, including...\"", rule: "Give the total before examples." },
  { draft: "Listed every barrier, or just said \"the barriers\".", fix: "\"visa, travel and financial barriers\".", rule: "Group long lists into types." },
  { draft: "Showed a few projects as if all used the same model.", fix: "Added that others use similar or different approaches; no single model fits every place.", rule: "Don't flatten different approaches into one." },
  { draft: "Headline built around a minidoc the article barely covers.", fix: "\"From Mauritius to El Zonte: Africa's Bitcoin Circular Economies Summit\".", rule: "Headline what the article actually covers." },
  { draft: "\"African Bitcoin Circular Economies Summit Captured on Film\".", fix: "A title that states the story's value.", rule: "Titles are not event labels or recaps." },
  { draft: "Meta description took a stance.", fix: "A factual description.", rule: "Meta descriptions are factual." },
  { draft: "A table of figures.", fix: "Short paragraphs.", rule: "No tables: the CMS does not render them." },
  { draft: "Project names unlinked and unmarked.", fix: "Project names in bold.", rule: "Bold project names on first mention when not linked." },
  { draft: "Claims and figures without links.", fix: "Each figure linked to its source, and earlier BAS stories backlinked.", rule: "Link every figure to its source and backlink BAS coverage." },
];
