/** Operator terms for LOKR. Not a substitute for a lawyer’s review. */

export const LEGAL_CONTACT =
  process.env.NEXT_PUBLIC_ENTERPRISE_EMAIL ?? "hello@go-i-agency.com";

export const TERMS = {
  title: "Terms of use",
  updated: "August 15, 2026",
  intro:
    "LOKR is a private messaging and file space run by Skyland. These terms protect the people who use it in good faith, and they protect Skyland from people who would use it to harm others or break the law. By creating an account or using LOKR, you agree to them.",
  sections: [
    {
      title: "Your account",
      body: "You must be 18 or older to create an account. You are responsible for the people you invite and for what happens in the conversations you start. Keep your password to yourself. If you invite a minor, you are responsible for that use.",
    },
    {
      title: "Your content is yours — and your problem if it is illegal",
      body: "Messages, files, recordings, and calls in LOKR are created by users, not by Skyland. You are responsible for what you send and store. Skyland does not routinely read private messages. That privacy is not a license to commit crimes, threaten people, or share illegal material.",
    },
    {
      title: "What you may not do",
      body: "You may not use LOKR to share child sexual abuse material or other illegal files; threaten, stalk, or incite violence; upload malware; impersonate someone else; try to break into other people’s Lockrs; or use the service to traffic in stolen data, fraud, or anything else that is illegal where you are. We will suspend or close accounts that do this, and we may keep records and report them to law enforcement when the law requires it or when a serious report leaves us no responsible choice.",
    },
    {
      title: "Reports and enforcement",
      body: "If someone reports illegal or abusive activity, we may look at the reported material, suspend accounts, remove content, and cooperate with a valid legal demand. We do not have to give a warning first. We are not a court. We decide, in our judgment, what is needed to keep the service from being used as a weapon.",
    },
    {
      title: "Calls and third-party relays",
      body: "Video and voice try to connect the two browsers directly. If that fails, a relay (such as Cloudflare TURN) may carry encrypted call packets so the call can complete. Relays can see that a call happened, from which networks, and for how long. They do not receive your Lokr messages or files. Google and Cloudflare STUN may also see a public IP during call setup.",
    },
    {
      title: "No guarantee, limited liability",
      body: "LOKR is provided as-is. We work to keep it locked and running, but we do not promise it will always be available, or that other users will behave. To the fullest extent the law allows, Skyland is not liable for what users post, for lost files, or for damages beyond the amount you paid us in the 12 months before a claim (or $0 if you are on Free). Some places do not allow these limits. In those places, they apply only as far as they can.",
    },
    {
      title: "We can change these terms",
      body: "If we change them in a material way, we will post the new date on Settings. Continued use after that is acceptance of the update.",
    },
  ],
} as const;
