// The words of every push notification, in the three app languages. The server
// writes them because it is the server that sends; the app's own translation
// files are not available here. Wording follows src/i18n/locales.
//
// Job titles, business names and message text are inserted as their author
// wrote them, in whatever language that was.

export type Lang = "ar" | "fr" | "en";
export type Text = { title: string; body: string };

/** "1.2" in English and Arabic, "1,2" in French. Western digits everywhere, as in the app. */
function decimal(value: number, lang: Lang): string {
  const text = String(Math.round(value * 10) / 10);
  return lang === "fr" ? text.replace(".", ",") : text;
}

/** "650 m" under a kilometre, "1.2 km" above, as on the job card. */
export function distanceText(meters: number, lang: Lang): string {
  const rounded = Math.round(Math.max(0, meters) / 10) * 10;
  const [value, unit] =
    rounded < 1000
      ? [String(rounded), lang === "ar" ? "م" : "m"]
      : [decimal(meters / 1000, lang), lang === "ar" ? "كم" : "km"];
  return `${value} ${unit}`;
}

const PERIOD: Record<Lang, Record<"hour" | "day" | "month", string>> = {
  en: { hour: "TND per hour", day: "TND per day", month: "TND per month" },
  fr: { hour: "TND par heure", day: "TND par jour", month: "TND par mois" },
  ar: { hour: "دينار في الساعة", day: "دينار في النهار", month: "دينار في الشهر" },
};

export function payText(amount: number, period: "hour" | "day" | "month", lang: Lang): string {
  // Up to three decimals, since the dinar has millimes; trailing zeros dropped.
  const number = String(Math.round(amount * 1000) / 1000);
  return `${lang === "fr" ? number.replace(".", ",") : number} ${PERIOD[lang][period]}`;
}

/** A new job in range. The distance is the point of the notification, so it is never left out. */
export function newJobText(
  lang: Lang,
  job: { title: string; payAmount: number; payPeriod: "hour" | "day" | "month" },
  companyName: string,
  distanceM: number,
): Text {
  const distance = distanceText(distanceM, lang);
  const from = { en: `${distance} from you`, fr: `à ${distance} de vous`, ar: `${distance} عليك` }[lang];
  return {
    title: `${job.title} · ${payText(job.payAmount, job.payPeriod, lang)}`,
    body: `${companyName} · ${from}`,
  };
}

/** Arabic counts change the noun: one, two, three to ten, eleven and up. */
function arabicCount(n: number, one: string, two: string, few: string, many: string): string {
  if (n === 1) return one;
  if (n === 2) return two;
  const lastTwo = n % 100;
  return lastTwo >= 3 && lastTwo <= 10 ? `${n} ${few}` : `${n} ${many}`;
}

/** The morning summary: jobs posted overnight, or the day's jobs for someone who asked for one push a day. */
export function digestText(lang: Lang, count: number): Text {
  return {
    en: {
      title: count === 1 ? "1 new job near you" : `${count} new jobs near you`,
      body: "Open Ba7dhek to see them, nearest first.",
    },
    fr: {
      title: count === 1 ? "1 nouvelle offre près de vous" : `${count} nouvelles offres près de vous`,
      body: "Ouvrez Ba7dhek pour les voir, les plus proches d’abord.",
    },
    ar: {
      title: `${arabicCount(count, "خدمة جديدة", "زوز خدم جدد", "خدم جدد", "خدمة جديدة")} بحذاك`,
      body: "حلّ بحذاك باش تشوفهم، الأقرب هو الأول.",
    },
  }[lang];
}

/** An employer accepted the application and a chat is open. */
export function matchText(lang: Lang, companyName: string): Text {
  return {
    en: { title: `${companyName} wants to talk to you`, body: "Open the chat." },
    fr: { title: `${companyName} souhaite vous parler`, body: "Ouvrez la discussion." },
    ar: { title: `${companyName} يحب يحكي معاك`, body: "حلّ المحادثة." },
  }[lang];
}

/** A chat message: who wrote, and the start of what they wrote. */
export function messageText(senderName: string, preview: string): Text {
  return { title: senderName, body: preview };
}

export function applicantsText(lang: Lang, count: number, jobTitle: string): Text {
  return {
    en: {
      title: count === 1 ? "1 new applicant" : `${count} new applicants`,
      body: jobTitle,
    },
    fr: {
      title: count === 1 ? "1 nouvelle candidature" : `${count} nouvelles candidatures`,
      body: jobTitle,
    },
    ar: {
      title: arabicCount(count, "مترشّح جديد", "زوز مترشّحين جدد", "مترشّحين جدد", "مترشّح جديد"),
      body: jobTitle,
    },
  }[lang];
}

export function companyApprovedText(lang: Lang, companyName: string): Text {
  return {
    en: { title: `${companyName} is approved`, body: "You can publish your jobs now." },
    fr: { title: `${companyName} est validé`, body: "Vous pouvez publier vos offres." },
    ar: { title: `${companyName} تقبل`, body: "تنجّم تنشر العروض متاعك توّا." },
  }[lang];
}
