import type { Org } from "./types";

// Seed list, carried over from the BAS Link Outreach tracker. Organisations added in Studio
// are stored in Firestore and merged with these (see /api/outreach).

// Where each organisation is based (country level). Pan-African or global ones have no entry.
export const WHERE: Record<string, string> = {
  "rurbit": "Burundi",
  "btc-shule": "Burundi",
  "bitcoin-boma": "Malawi",
  "the-core": "Kenya",
  "bitika": "Kenya",
  "tando": "Kenya",
  "afribit-kibera": "Kenya",
  "bitcoin-victoria-falls": "Zambia",
  "orphans-of-uganda": "Uganda",
  "bitcoin-mastermind-2026": "Benin",
  "bitcoin-aves-education-hub": "Ghana",
  "dakar-bitcoin-days": "Senegal",
  "catastrophe": "South Africa",
  "exonumia-africa": "South Africa",
  "bitcoinfriendlysa": "South Africa",
  "bit-fitness": "South Africa",
  "bitcoin-ekasi": "South Africa",
  "adopting-bitcoin-capetown": "South Africa",
  "moneybadger": "South Africa",
  "free-market-foundation": "South Africa",
  "molobtc": "South Africa"
};

const COVERAGE_RAW: Omit<Org, "kind" | "where">[] = [
  {
    "name": "Rurbit",
    "slug": "rurbit",
    "site": "https://rurbit.com",
    "priority": "high",
    "why": "We have covered Rurbit twice: how 100 people in rural Burundi use Bitcoin over USSD without the internet, and the new IBBM+ off-ramp.",
    "stories": [
      [
        "Rurbit: 100 Users in Rural Burundi Are Using Bitcoin Without the Internet",
        "/news/rurbit-bitcoin-ussd-burundi"
      ],
      [
        "Rurbit Adds IBBM+ as a Bitcoin Off-Ramp in Burundi",
        "/news/rurbit-adds-ibbm-as-a-bitcoin-off-ramp-in-burundi"
      ]
    ]
  },
  {
    "name": "Bitcoin Boma",
    "slug": "bitcoin-boma",
    "site": "https://bitcoinboma.org",
    "priority": "high",
    "why": "We wrote up Bitcoin Boma’s university workshops in Malawi, which drew 263 students.",
    "stories": [
      [
        "Bitcoin Boma Workshops Draw 263 Students in Malawi",
        "/news/bitcoin-boma-malawi-university-workshops-2026"
      ]
    ]
  },
  {
    "name": "The Core",
    "slug": "the-core",
    "site": "https://www.thecore.africa",
    "priority": "high",
    "why": "We have covered The Core twice: its Bitcoin education at a Kenyan university campus, and Bitcoin Githurai’s new physical education hub in Nairobi.",
    "stories": [
      [
        "The Core Takes Bitcoin Education to a Kenyan University Campus",
        "/news/the-core-takes-bitcoin-education-to-a-kenyan-university-campus"
      ],
      [
        "Bitcoin Githurai Opens a Physical Education Hub in Nairobi",
        "/news/bitcoin-githurai-physical-education-hub-nairobi"
      ]
    ]
  },
  {
    "name": "Bitcoin Victoria Falls",
    "slug": "bitcoin-victoria-falls",
    "site": "https://bitcoinvictoriafalls.com",
    "priority": "high",
    "why": "We wrote about Bitcoin Victoria Falls graduating its new My First Bitcoin cohort.",
    "stories": [
      [
        "Bitcoin Victoria Falls Graduates New My First Bitcoin Cohort",
        "/news/bitcoin-victoria-falls-graduates-new-my-first-bitcoin-cohort"
      ]
    ]
  },
  {
    "name": "Orphans of Uganda",
    "slug": "orphans-of-uganda",
    "site": "https://orphans-of-uganda.org",
    "priority": "high",
    "why": "We wrote about the school fees campaign for Orphans of Uganda that was paid in sats.",
    "stories": [
      [
        "Orphans of Uganda: A School Fees Campaign Paid in Sats",
        "/news/orphans-of-uganda-a-school-fees-campaign-paid-in-sats"
      ]
    ]
  },
  {
    "name": "Machankura",
    "slug": "machankura",
    "site": "https://8333.mobi",
    "priority": "high",
    "why": "We published a plain-language explainer on how Machankura lets people send Bitcoin from a basic phone with no internet.",
    "stories": [
      [
        "Machankura: Send Bitcoin on a Basic Phone With No Internet",
        "/news/machankura-send-bitcoin-on-a-basic-phone-with-no-internet"
      ]
    ]
  },
  {
    "name": "BTC Shule",
    "slug": "btc-shule",
    "site": "https://btcshule.com",
    "priority": "high",
    "why": "We wrote about the Nakamoto Hope Center, BTC Shule’s Bitcoin village in Burundi.",
    "stories": [
      [
        "Nakamoto Hope Center: BTC Shule’s Bitcoin Village, Burundi",
        "/news/nakamoto-hope-center-btc-shule"
      ]
    ]
  },
  {
    "name": "CATASTROPHE",
    "slug": "catastrophe",
    "site": "https://catastrophe.co.za",
    "priority": "high",
    "why": "We have covered CATASTROPHE’s work on South Africa’s cross-border Bitcoin rules twice, most recently after the comment deadline closed.",
    "stories": [
      [
        "CATASTROPHE: South Africa Is Deciding How Bitcoin Crosses Its Borders",
        "/news/catastrophe-south-africa-is-deciding-how-bitcoin-crosses-its-borders"
      ],
      [
        "After the Deadline: Where South Africa’s Cross-Border Bitcoin Rules Stand",
        "/news/after-the-deadline-where-south-africas-cross-border-bitcoin-rules-stand"
      ]
    ]
  },
  {
    "name": "Exonumia Africa",
    "slug": "exonumia-africa",
    "site": "https://exonumia.africa",
    "priority": "high",
    "why": "We published an explainer on Mantra, Exonumia Africa’s end-to-end encrypted translation tool.",
    "stories": [
      [
        "What Is Mantra? Exonumia Africa’s E2EE Translation Tool",
        "/news/what-is-mantra-exonumia-africas-e2ee-translation-tool"
      ]
    ]
  },
  {
    "name": "Flash",
    "slug": "flash",
    "site": "https://bitcoinflash.xyz",
    "priority": "high",
    "why": "We published a first-hand guide to off-ramping Bitcoin to CFA in Benin with Flash.",
    "stories": [
      [
        "Using Flash to Offramp My Bitcoin to CFA in Benin",
        "/news/using-flash-to-offramp-my-bitcoin-to-cfa-in-benin"
      ]
    ]
  },
  {
    "name": "Bitcoin Mastermind",
    "slug": "bitcoin-mastermind-2026",
    "site": "https://btcmastermind.xyz",
    "priority": "high",
    "why": "We covered Bitcoin Mastermind 2026 twice: what the conference is, and a first-hand look at Cotonou’s Bitcoin community.",
    "stories": [
      [
        "What Is Bitcoin Mastermind 2026? Benin’s Bitcoin Conference",
        "/news/what-is-bitcoin-mastermind-2026-benins-bitcoin-conference"
      ],
      [
        "Inside Bitcoin Mastermind 2026: A First-Hand Look at Cotonou’s Bitcoin Community",
        "/news/inside-bitcoin-mastermind-2026-a-first-hand-look-at-cotonous-bitcoin-community"
      ]
    ]
  },
  {
    "name": "PoWBoT",
    "slug": "powbot",
    "site": "https://powbot.africa",
    "priority": "high",
    "why": "We told the story of how PoWBoT was built by a non-programmer with AI help, and how it pays Bitcoin merchants across Africa.",
    "stories": [
      [
        "PoWBoT: How a Non-Programmer Built an AI-Assisted Tool That’s Paying Bitcoin Merchants Across Africa",
        "/news/powbot-how-a-non-programmer-built-an-ai-assisted-tool-that-s-paying-bitcoin-merchants-across-africa"
      ]
    ]
  },
  {
    "name": "BitcoinFriendlySA",
    "slug": "bitcoinfriendlysa",
    "site": "https://www.bitcoinfriendlysa.co.za",
    "priority": "high",
    "why": "We covered the launch of BitcoinFriendlySA, South Africa’s first Bitcoin-only online store.",
    "stories": [
      [
        "BitcoinFriendlySA Launches South Africa’s First Bitcoin-Only Online Store",
        "/news/bitcoinfriendlysa-launches-south-africa-s-first-bitcoin-only-online-store"
      ]
    ]
  },
  {
    "name": "Bitika",
    "slug": "bitika",
    "site": "https://bitika.xyz",
    "priority": "high",
    "why": "We published a case study on Bitika.",
    "stories": [
      [
        "The ‘Bitika’ Case Study",
        "/news/the-bitika-case-study"
      ]
    ]
  },
  {
    "name": "Tando",
    "slug": "tando",
    "site": "https://tando.me",
    "priority": "high",
    "why": "We wrote about how Tando is bringing Bitcoin into Kenya’s everyday economy.",
    "stories": [
      [
        "Tando: Pioneering Bitcoin Adoption in Kenya’s Everyday Economy",
        "/news/tando-driving-bitcoin-adoption-in-kenya"
      ]
    ]
  },
  {
    "name": "BitFitness",
    "slug": "bit-fitness",
    "site": "https://bitfitness21m.com",
    "priority": "high",
    "why": "We have covered BitFitness twice, from Challenge 3 to a Bitcoin runner taking on Cape Town’s Nelson Mandela Marathon.",
    "stories": [
      [
        "Bitcoin Runner Takes On Cape Town’s Nelson Mandela Marathon",
        "/news/bitcoin-runner-takes-on-cape-towns-nelson-mandela-marathon"
      ],
      [
        "BitFitness Challenge 3: 21-Day Workout & Earn 21,000 Sats",
        "/news/bitfitness-challenge-3"
      ]
    ]
  },
  {
    "name": "Afribit Kibera",
    "slug": "afribit-kibera",
    "site": "https://afribit.africa",
    "priority": "high",
    "why": "We published a piece on what Afribit Kibera got right that most Bitcoin projects get wrong.",
    "stories": [
      [
        "4 Things Afribit Kibera Got Right That Most Bitcoin Projects Get Wrong",
        "/news/4-things-afribit-kibera-got-right-that-most-bitcoin-projects-get-wrong"
      ]
    ]
  },
  {
    "name": "Bitcoin Aves Education Hub",
    "slug": "bitcoin-aves-education-hub",
    "site": "",
    "priority": "high",
    "why": "We published a feature on the Bitcoin Aves Education Hub, Ghana’s grassroots Bitcoin learning centre in Akatsi.",
    "stories": [
      [
        "Inside the Bitcoin Aves Education Hub: Ghana’s Grassroots Bitcoin Learning Centre in Akatsi",
        "/news/inside-the-bitcoin-aves-education-hub-ghana-s-grassroots-bitcoin-learning-centre-in-akatsi"
      ]
    ]
  },
  {
    "name": "Dakar Bitcoin Days",
    "slug": "dakar-bitcoin-days",
    "site": "https://dakarbitcoindays.com",
    "priority": "medium",
    "why": "We previewed Dakar Bitcoin Days IV, West Africa’s Bitcoin-only forum, for our readers.",
    "stories": [
      [
        "Dakar Bitcoin Days IV: West Africa’s Bitcoin-Only Forum Returns to Senegal",
        "/news/dakar-bitcoin-days-2026"
      ]
    ]
  },
  {
    "name": "Btrust",
    "slug": "btrust",
    "site": "https://www.btrust.tech",
    "priority": "medium",
    "why": "We covered Btrust’s Q3 2026 developer grants, ten contributors across three countries.",
    "stories": [
      [
        "Btrust Announces Q3 2026 Developer Grants",
        "/news/btrust-q3-2026-developer-grants"
      ],
      [
        "Keynote Highlight ABC25: Abubakar Nur Khalil, CEO, Btrust",
        "/news/keynote-highlight-abc25-abubakar-nur-khalil-ceo-btrust"
      ]
    ]
  },
  {
    "name": "Bitcoin Ekasi",
    "slug": "bitcoin-ekasi",
    "site": "https://bitcoinekasi.com",
    "priority": "medium",
    "why": "We published a deep dive on the Circular Bitcoin Africa Fund (CBAF), alongside our earlier piece on Bitcoin Ekasi and circular economies.",
    "stories": [
      [
        "Inside the Circular Bitcoin Africa Fund (CBAF)",
        "/news/inside-the-circular-bitcoin-africa-fund-cbaf"
      ],
      [
        "How Bitcoin Beach and Bitcoin Ekasi Are Proving Bitcoin Circular Economies Work",
        "/news/bitcoin-circular-economy-africa"
      ]
    ]
  },
  {
    "name": "Adopting Bitcoin",
    "slug": "adopting-bitcoin-capetown",
    "site": "https://adoptingbitcoin.org",
    "priority": "medium",
    "why": "We published a guide to Adopting Bitcoin Cape Town 2027 and what attendees can expect.",
    "stories": [
      [
        "Adopting Bitcoin Cape Town 2027: What to Expect",
        "/news/adopting-bitcoin-cape-town-2027-what-to-expect-at-southern-africas-bitcoin-conference"
      ]
    ]
  },
  {
    "name": "MoneyBadger",
    "slug": "moneybadger",
    "site": "https://www.moneybadger.co.za",
    "priority": "medium",
    "why": "We have written about MoneyBadger twice, including Ozow’s launch of crypto payments with MoneyBadger.",
    "stories": [
      [
        "MoneyBadger: South Africa’s Bitcoin Payment Badger",
        "/news/moneybadger-south-africa-s-bitcoin-payment-badger"
      ],
      [
        "Ozow Launches Cryptocurrency Payments with MoneyBadger",
        "/news/south-african-fintech-ozow-launches-cryptocurrency-payments-with-moneybadger"
      ]
    ]
  },
  {
    "name": "African Bitcoiners",
    "slug": "african-bitcoiners",
    "site": "https://bitcoiners.africa",
    "priority": "medium",
    "why": "We announced the Most Impactful African Bitcoiners 2026 nominations to our readers.",
    "stories": [
      [
        "Most Impactful African Bitcoiners 2026: Nominations Open",
        "/news/most-impactful-african-bitcoiners-2026-nominations-open"
      ]
    ]
  },
  {
    "name": "Free Market Foundation",
    "slug": "free-market-foundation",
    "site": "https://www.freemarketfoundation.com",
    "priority": "medium",
    "why": "Our coverage of South Africa’s Bitcoin regulation debate features the Free Market Foundation.",
    "stories": [
      [
        "Can South Africa Control Bitcoin? The Regulation Fight",
        "/news/can-south-africa-control-bitcoin-the-regulation-fight"
      ]
    ]
  },
  {
    "name": "Africa Bitcoin Conference",
    "slug": "africa-bitcoin-conference",
    "site": "https://afrobitcoin.org",
    "priority": "medium",
    "why": "We covered the Africa Bitcoin Conference 2026 heading to Blantyre, Malawi.",
    "stories": [
      [
        "Africa Bitcoin Conference 2026 Heads to Blantyre, Malawi",
        "/news/africa-bitcoin-conference-2026-heads-to-blantyre-malawi"
      ]
    ]
  },
  {
    "name": "Human Rights Foundation",
    "slug": "human-rights-foundation",
    "site": "https://hrf.org",
    "priority": "low",
    "why": "We spotlighted the African grantees in HRF’s 1.5 billion sat grant round.",
    "stories": [
      [
        "HRF Awards 1.5 Billion Satoshis to 26 Bitcoin Projects: A Spotlight on African Grantees",
        "/news/hrf-awards-1-5-billion-satoshis-to-26-bitcoin-projects-a-spotlight-on-african-grantees"
      ]
    ]
  },
  {
    "name": "MoloBTC",
    "slug": "molobtc",
    "site": "https://www.molobtc.africa",
    "priority": "medium",
    "why": "We published an explainer on MoloBTC, Africa’s open-source Bitcoin project.",
    "stories": [
      [
        "What Is MoloBTC? Africa’s Open-Source Bitcoin Project",
        "/news/molobtc"
      ]
    ]
  }
];

const DIRECTORY_RAW: (Omit<Org, "kind" | "stories">)[] = [
  {
    "name": "Bitcoin Kampala",
    "slug": "bitcoin-kampala",
    "site": "https://bitcoinkampala.org",
    "priority": "high",
    "where": "Uganda",
    "why": "The profile covers Bitcoin Kampala’s merchant and student community in Uganda."
  },
  {
    "name": "Bitcoin Ubuntu",
    "slug": "bitcoin-ubuntu",
    "site": "https://bitcoinubuntu.org",
    "priority": "high",
    "where": "South Africa",
    "why": "The profile covers Bitcoin Ubuntu’s free onboarding and education in Swellendam, and PoWBoT."
  },
  {
    "name": "Bitbiashara",
    "slug": "bitbiashara",
    "site": "https://www.bitbiashara.com",
    "priority": "high",
    "where": "Kenya",
    "why": "The profile covers Bitbiashara’s circular economy work in Kenya and its CBAF results."
  },
  {
    "name": "Bitsacco",
    "slug": "bitsacco",
    "site": "https://bitsacco.com",
    "priority": "high",
    "where": "Kenya",
    "why": "The profile covers how Bitsacco brings Bitcoin to the SACCO savings model."
  },
  {
    "name": "Bitcoin Dua",
    "slug": "bitcoin-dua",
    "site": "https://www.bitcoindua.org",
    "priority": "high",
    "where": "Ghana",
    "why": "The profile covers Bitcoin Dua’s circular economy in Ghana."
  },
  {
    "name": "Bitcoin Babies",
    "slug": "bitcoin-babies",
    "site": "https://bitcoinbabies.com",
    "priority": "high",
    "where": "Kenya",
    "why": "The profile covers Bitcoin Babies, where mothers in Kenya save in Bitcoin."
  },
  {
    "name": "Naija Bitcoin Organisation",
    "slug": "naija-bitcoin-organisation",
    "site": "https://naijabitcoin.org",
    "priority": "high",
    "where": "Nigeria",
    "why": "The profile covers the Naija Bitcoin Organisation’s community building in Nigeria."
  },
  {
    "name": "Bitcoin School Kenya",
    "slug": "bitcoin-school-kenya",
    "site": "https://www.bitcoinschoolke.com",
    "priority": "high",
    "where": "Kenya",
    "why": "The profile covers Bitcoin School Kenya’s diplomas and practical training."
  },
  {
    "name": "Nakamoto Hope Center",
    "slug": "nakamoto-hope-center",
    "site": "https://nakamotohope.center",
    "priority": "high",
    "where": "Burundi",
    "why": "The profile covers the Nakamoto Hope Center, the Bitcoin education hub in Winteko."
  },
  {
    "name": "Bitcoin Loxion",
    "slug": "bitcoin-loxion",
    "site": "https://bitcoinloxion.com",
    "priority": "high",
    "where": "South Africa",
    "why": "The profile covers Bitcoin Loxion’s work in Khayelitsha."
  },
  {
    "name": "Bitcoin Plett",
    "slug": "bitcoin-plett",
    "site": "https://bitcoinplett.cx",
    "priority": "high",
    "where": "South Africa",
    "why": "The profile covers Bitcoin Plett’s merchant onboarding and weekly meetups in Plettenberg Bay."
  },
  {
    "name": "Gorilla Sats",
    "slug": "gorilla-sats",
    "site": "https://gorilla-sats.com",
    "priority": "medium",
    "where": "Uganda",
    "why": "The profile covers Gorilla Sats and its Bitcoin tourism in Uganda."
  },
  {
    "name": "BOSS Challenge",
    "slug": "boss-challenge",
    "site": "https://bosschallenge.xyz",
    "priority": "medium",
    "where": "pan",
    "why": "The profile covers the BOSS Challenge developer programme and its African graduates."
  },
  {
    "name": "Gridless",
    "slug": "gridless",
    "site": "https://gridlesscompute.com",
    "priority": "medium",
    "where": "Kenya",
    "why": "The profile covers Gridless and its Bitcoin mining in Kenya."
  },
  {
    "name": "Mantra",
    "slug": "mantra",
    "site": "https://mantra.press",
    "priority": "medium",
    "where": "South Africa",
    "why": "The profile covers Mantra, the translation tool for Bitcoin literature built on Nostr."
  },
  {
    "name": "BitDevs Gitega",
    "slug": "bitdevs-gitega",
    "site": "https://bitdevsgtga.org",
    "priority": "medium",
    "where": "Burundi",
    "why": "The profile covers BitDevs Gitega’s developer community in Burundi."
  },
  {
    "name": "Africa Free Routing",
    "slug": "africa-free-routing",
    "site": "https://freerouting.africa",
    "priority": "medium",
    "where": "pan",
    "why": "The profile covers Africa Free Routing and its Lightning developer bootcamp."
  },
  {
    "name": "Bitcoin Dada",
    "slug": "bitcoin-dada",
    "site": "https://btcdada.com",
    "priority": "medium",
    "where": "pan",
    "why": "The profile covers Bitcoin Dada’s community for African women in Bitcoin."
  },
  {
    "name": "VALR",
    "slug": "valr",
    "site": "https://www.valr.com",
    "priority": "low",
    "where": "South Africa",
    "why": "The profile covers VALR, the South African exchange."
  },
  {
    "name": "Federation of Bitcoin Circular Economies",
    "slug": "federation-of-bitcoin-circular-economies",
    "site": "https://fbce.io",
    "priority": "low",
    "where": "pan",
    "why": "The profile covers the Federation and its part in founding CBAF."
  },
  {
    "name": "Bitcoin Karoo",
    "slug": "bitcoin-karoo",
    "site": "https://x.com/BitcoinKaroo",
    "priority": "low",
    "where": "South Africa",
    "why": "The profile covers Bitcoin Karoo’s merchant adoption and education work."
  },
  {
    "name": "Bitcoin Witsand",
    "slug": "bitcoin-witsand",
    "site": "https://x.com/BitcoinWitsand",
    "priority": "low",
    "where": "South Africa",
    "why": "The profile covers Bitcoin Witsand, where more than 45 businesses accept Bitcoin."
  },
  {
    "name": "EcoBitz",
    "slug": "ecobitz",
    "site": "https://x.com/EcoBitz_21m",
    "priority": "low",
    "where": "Kenya",
    "why": "The profile covers EcoBitz, which pays recyclers in sats."
  }
];

export const COVERAGE: Org[] = COVERAGE_RAW.map((o) => ({
  ...o,
  kind: "coverage" as const,
  where: WHERE[o.slug],
}));

export const DIRECTORY: Org[] = DIRECTORY_RAW.map((o) => ({ ...o, stories: [], kind: "directory" as const }));

export const SEED_ORGS: Org[] = [...COVERAGE, ...DIRECTORY];
