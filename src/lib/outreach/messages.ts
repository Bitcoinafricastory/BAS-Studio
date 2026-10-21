import type { Org } from "./types";

export const SITE = "https://www.bitcoinafricastory.com";

const host = (u: string) => String(u || "").replace(/^https?:\/\/(www\.)?/, "").replace(/\/.*$/, "");
export const isSocial = (u: string) => /(^|\/\/)(www\.)?(x|twitter)\.com\//.test(u || "");

export function message(o: Org): string {
  if (o.kind === "directory") return directoryMessage(o);
  const many = o.stories.length > 1;
  const storyLines = o.stories.map(([t, p]: [string, string]) => `“${t}”\n${SITE}${p}`).join('\n\n');
  const where = o.site && !isSocial(o.site) ? ` (${host(o.site)})` : "";
  const times = o.stories.length === 2 ? "twice" : `${o.stories.length} times`;
  return `Hi ${o.name} team,

I’m Destiny from Bitcoin Africa Story. ${many ? `We’ve written about ${o.name} ${times}` : `We wrote a story about ${o.name}`}:

${storyLines}

We’d love for more people to see what you’re building. Would you be up for adding a link to ${many ? 'these' : 'it'} on your website${where}? A press or “featured in” page or section would be perfect, but your About page, blog or footer works too. It helps both of us. More people find ${o.name}, and more people find our stories. A share on your socials would be great as well.

And if you’ve got anything new coming up, I’d love to hear about it.

Thanks for the work you’re doing,
Destiny
Bitcoin Africa Story`;
}

export function directoryMessage(o: Org): string {
  return `Hi ${o.name} team,

I’m Destiny from Bitcoin Africa Story. ${o.name} is in our directory of Bitcoin projects across Africa:
${SITE}/directory/${o.slug}

If you send me your Blink username, I’ll add a tip button to your profile so readers can send you sats directly.

Thanks for the work you’re doing,
Destiny
Bitcoin Africa Story`;
}

// Follow-ups, for when a message gets no reply. n is 1 to 5; each one tries a different angle.
const US_ON_X = "@story_bitcoin";
export function followUp(o: Org, n: number): string {
  const hi = `Hi ${o.name} team,\n\n`;
  const profile = `${SITE}/directory/${o.slug}`;
  if (o.kind === "directory") {
    return hi + [
      `Just checking in. What have you been working on lately? If there’s something you’re excited about, I’d love to hear it. It might make a good story.

Here’s your profile again:
${profile}

Destiny`,
      `Hope all’s well. Just a small nudge: if you’d like the tip button on your profile, send me your Blink username any time and I’ll set it up.

We’ll keep following what you’re doing.

Destiny`,
      `Quick question: is there someone else on your team I should talk to about your profile? Happy to send the details to them instead.

Destiny`,
      `Just wanted to make sure your profile still looks right:
${profile}

If anything has changed, like your website, socials or what you’re focused on, let me know and I’ll update it.

Destiny`,
      `Friendly hello from Bitcoin Africa Story. Whenever you’re ready, send me your Blink username for the tip button, or any news you’d like us to cover.

We’ll keep following what you’re doing.

Destiny`,
    ][n - 1];
  }
  const url = SITE + o.stories[0][1];
  return hi + [
    `Just bumping this up in case it got buried:
${url}

If you get a moment to link to it from your site or share it, it’d really help us out.

Thanks,
Destiny`,
    `Hope things are going well over there. I know inboxes get busy, so one more small nudge on this:
${url}

A link from your site or a quick share would mean a lot to us. Either way, we’ll keep following what you’re doing.

Destiny`,
    `In case a website link is a hassle, a quick post sharing the story would help just as much:
${url}

Feel free to tag us (${US_ON_X}) so we can share it too.

Destiny`,
    `How are things going with ${o.name}? Anything new since we wrote about you? If there’s news, we’d love to do a follow-up story.

And if you ever get a chance to link to our story from your site, here it is again:
${url}

Destiny`,
    `Just a friendly hello. I’m still keen to help more people find ${o.name}’s work. Whenever you have a moment, a link to our story from your site would really help:
${url}

And our door is always open for your news.

Destiny`,
  ][n - 1];
}

// Story leads: once they reply, ask them to check their profile.
export function reviewMessage(o: Org): string {
  return `Hi ${o.name} team,

Thanks for getting back to me! While I have you, could you take a quick look at your profile?
${SITE}/directory/${o.slug}

If anything’s off or missing, like your description, logo, website or social links, just send it over and I’ll fix it.

Destiny`;
}

