import type { AuthorRecord } from "./types";

// The generator may only tag handles from this list or from links inside the article.
// Edit this file to add people and projects; a handle that is unknown is written as a
// plain name and flagged, never guessed. (Spec: "Handle Registry".)
export interface RegistryEntry {
  name: string;
  handle: string; // without @
  who: string;
  source: string;
}

export const HANDLE_REGISTRY: RegistryEntry[] = [
  { name: "Bitcoin Africa Story", handle: "btcafricastory", who: "Publication", source: "BAS" },
  { name: "Destiny Smart", handle: "Destinysmart_", who: "BAS editor and founder", source: "BAS author record" },
  { name: "Abubakar Nur Khalil", handle: "ihate1999", who: "CEO, Btrust", source: "Linked in the BAS Btrust article" },
  { name: "Btrust", handle: "btrustteam", who: "Bitcoin developer nonprofit", source: "BAS Btrust article" },
  { name: "Zack Dorsey", handle: "zackdorseyx", who: "Filmmaker, Africa circular economies minidoc", source: "His own posts" },
  { name: "Bitcoin Beach", handle: "Bitcoinbeach", who: "El Zonte circular economy", source: "Its own posts" },
  { name: "Federation of Bitcoin Circular Economies", handle: "fbce", who: "FBCE network", source: "Tagged in Bitcoin Beach's post" },
  { name: "Ayobami Atolagbe", handle: "thecoachayobami", who: "Founder, BitKwa (Nigeria)", source: "Zack Dorsey's clip post" },
  { name: "BitKwa", handle: "BitKwaofficial", who: "Nigerian Bitcoin project", source: "Zack Dorsey's clip post" },
  { name: "Brindon Mwiine", handle: "BrindonMwiine", who: "Founder, Bitcoin Kampala", source: "Editor" },
  { name: "Bitcoin Kampala", handle: "BitcoinKampala", who: "Ugandan circular economy", source: "Bitcoin Beach's clip post" },
  { name: "Bitcoin Ekasi", handle: "BitcoinEkasi", who: "South African circular economy", source: "Editor" },
  { name: "Afribit Kibera", handle: "afribitkibera", who: "Kenyan circular economy", source: "Editor" },
  { name: "BTC Shule", handle: "btcshule", who: "Burundian Bitcoin village project", source: "Editor" },
  { name: "Felix Mukungu", handle: "MukunguFelix", who: "Founder, The Core", source: "Linked in the BAS Unconference article" },
  { name: "The Core", handle: "thecore21m", who: "Kenyan Bitcoin education project", source: "BAS articles, Blink blog" },
  { name: "My First Bitcoin", handle: "MyFirstBitcoin_", who: "Bitcoin Diploma curriculum", source: "Editor" },
  { name: "Bitcoin Githurai", handle: "bitcoingithurai", who: "Nairobi circular economy", source: "BAS Githurai article" },
  { name: "Bitcoin School Kenya", handle: "BitcoinSchoolKe", who: "Kenyan Bitcoin school", source: "Editor" },
  { name: "EcoBitz", handle: "EcoBitz_21m", who: "Bitcoin project", source: "Editor" },
  { name: "Bitcoin Ikorodu", handle: "BitcoinIkorodu", who: "Nigerian circular economy", source: "Editor" },
  { name: "Susan Githaiga", handle: "Su_Githaiga", who: "Developer, Dada Devs alumna", source: "Editor" },
  { name: "Ryan Kuester", handle: "ryankuester", who: "Mujina maintainer", source: "Editor" },
];
// Yes Bitcoin Haiti is deliberately absent: it is named without a tag until its handle is confirmed.

export const BAS_X_HANDLE = "btcafricastory";

// Author records. The CMS stores only an author name on each article, so the X handle,
// LinkedIn name and Premium flag live here. Add each author as they join.
export const AUTHORS: AuthorRecord[] = [
  { name: "Destiny Smart", xHandle: "Destinysmart_", linkedinName: "Destiny Smart", premium: false },
];

export function findAuthor(name: string): AuthorRecord | undefined {
  const n = name.trim().toLowerCase();
  return AUTHORS.find((a) => a.name.toLowerCase() === n);
}

// Default hashtags per category (LinkedIn only; X never gets hashtags).
export const CATEGORY_HASHTAGS: Record<string, string[]> = {
  Adoption: ["#CircularEconomy"],
  Technology: ["#OpenSource"],
  Education: ["#BitcoinEducation"],
  Regulations: ["#BitcoinRegulation"],
  Economy: ["#BitcoinEconomy"],
  Security: ["#BitcoinSecurity"],
  Community: ["#BitcoinCommunity"],
};
