// Full article bodies, keyed by slug. Only imported by the lazy-loaded
// BlogPostPage, so this never bloats the main bundle.
//
// Block types consumed by BlogPostPage.jsx:
//   { type: 'heading', level: 2|3, text }
//   { type: 'paragraph', text }
//   { type: 'list', ordered?: boolean, items: [] }
//   { type: 'step', number, instruction, visual?: { kind, alt, ... }, tip? }
//   { type: 'callout', tone: 'privacy'|'tip'|'note', text }
//
// `visual` drives ExportStepVisual.jsx. These replaced dashed "screenshot
// placeholder" boxes that were never going to be filled: we cannot ship real
// captures of these apps (copyrighted UI, trademarked marks) on a commercial
// page. The illustrations show the menu PATH, which is the part that survives
// the redesigns these apps ship every few months.

const WHATSAPP_ANDROID_STEPS = [
  { instruction: 'Open the chat you want to analyse.', visual: { kind: 'chat', name: 'Riya', alt: 'A chat thread open on an Android phone' } },
  { instruction: 'Tap the three dots ⋮ in the top-right corner.', visual: { kind: 'chat', name: 'Riya', highlight: 'menu', alt: 'The three-dot menu icon in the top-right of the chat header' } },
  { instruction: 'Tap More, then tap Export chat.', visual: { kind: 'menu', title: 'More', items: ['Report', 'Block', 'Clear chat', 'Export chat', 'Add shortcut'], highlight: 3, alt: 'The More menu with Export chat highlighted' } },
  { instruction: 'Choose "Without media" — this keeps the file small and fast to upload.', visual: { kind: 'dialog', title: 'Export chat', body: 'Attach media?', actions: ['Without media', 'Include media'], highlight: 0, alt: 'Dialog asking whether to include media, with Without media chosen' }, tip: 'Media makes the export file huge and ThirdPerson AI only needs the text.' },
  { instruction: 'Share or save the .txt file to yourself — email, Google Drive, or your Files app all work.', visual: { kind: 'share', options: ['Drive', 'Email', 'Files', 'Keep', 'Docs', 'More'], highlight: 2, alt: 'Share sheet with a file destination highlighted' } },
  { instruction: 'Come back to ThirdPerson AI and upload that .txt file.', visual: { kind: 'app', mode: 'upload', file: 'WhatsApp Chat.txt', alt: 'The ThirdPerson AI upload screen with the exported file ready' } },
];

const WHATSAPP_IPHONE_STEPS = [
  { instruction: 'Open the chat you want to analyse.', visual: { kind: 'chat', name: 'Riya', alt: 'A chat thread open on an iPhone' } },
  { instruction: 'Tap the contact or group name at the top of the chat.', visual: { kind: 'chat', name: 'Riya', highlight: 'header', alt: 'The contact name at the top of the chat, highlighted' } },
  { instruction: 'Scroll down and tap Export Chat.', visual: { kind: 'list', title: 'Contact Info', items: ['Media, Links & Docs', 'Starred Messages', 'Mute', 'Wallpaper', 'Export Chat'], highlight: 4, alt: 'Contact info screen with Export Chat highlighted' } },
  { instruction: 'Choose Without Media.', visual: { kind: 'dialog', title: 'Export Chat', actions: ['Attach Media', 'Without Media'], highlight: 1, alt: 'Prompt to attach media, with Without Media chosen' } },
  { instruction: 'Tap Save to Files (or AirDrop it to yourself and save it from there).', visual: { kind: 'share', options: ['AirDrop', 'Messages', 'Mail', 'Save to Files', 'Notes', 'More'], highlight: 3, alt: 'iOS share sheet with Save to Files highlighted' } },
  { instruction: 'Open ThirdPerson AI and upload the saved .txt file.', visual: { kind: 'app', mode: 'upload', file: '_chat.txt', alt: 'The ThirdPerson AI upload screen on a phone' } },
];

export const BLOG_CONTENT = {
  'how-to-export-whatsapp-chats': [
    { type: 'paragraph', text: 'WhatsApp is the easiest app to export from, and it takes about a minute either way. Pick your device below.' },
    { type: 'callout', tone: 'privacy', text: 'Your chats are analysed securely and never shared.' },
    { type: 'heading', level: 2, text: 'Exporting on Android' },
    ...WHATSAPP_ANDROID_STEPS.map((step, index) => ({ type: 'step', number: index + 1, ...step })),
    { type: 'heading', level: 2, text: 'Exporting on iPhone' },
    ...WHATSAPP_IPHONE_STEPS.map((step, index) => ({ type: 'step', number: index + 1, ...step })),
    { type: 'heading', level: 3, text: 'What if I only want part of the conversation?' },
    { type: 'paragraph', text: 'WhatsApp always exports the full visible chat history on your device. If you only want a specific period, you can open the exported .txt file in any text editor and trim it before uploading, or simply paste the relevant section directly into ThirdPerson AI\'s paste box instead of uploading a file.' },
    { type: 'callout', tone: 'tip', text: 'Takes ~1 minute. Upload the .txt file directly — no need to convert or edit it.' },
  ],
  'how-to-export-instagram-messages': [
    { type: 'paragraph', text: 'Instagram doesn\'t let you export a single DM thread directly. Instead, you request your full data download, then pull out just the conversation you need. It sounds like more work than it is — here\'s the exact path.' },
    { type: 'callout', tone: 'note', text: 'Instagram can take anywhere from a few minutes to a few hours to prepare your file. You\'ll get a notification or email when it\'s ready.' },
    { type: 'step', number: 1, instruction: 'Open Instagram and go to Settings.', visual: { kind: 'menu', title: 'Profile menu', items: ['Settings and privacy', 'Your activity', 'Archive', 'QR code'], highlight: 0, alt: 'Profile menu with Settings and privacy highlighted' } },
    { type: 'step', number: 2, instruction: 'Tap Accounts Centre.', visual: { kind: 'list', title: 'Settings', items: ['Accounts Centre', 'Saved', 'Close Friends', 'Notifications'], highlight: 0, alt: 'Settings list with Accounts Centre highlighted' } },
    { type: 'step', number: 3, instruction: 'Tap Your information and permissions.', visual: { kind: 'list', title: 'Accounts Centre', items: ['Password and security', 'Personal details', 'Your information and permissions', 'Ad preferences'], highlight: 2, alt: 'Accounts Centre with Your information and permissions highlighted' } },
    { type: 'step', number: 4, instruction: 'Tap Download your information.', visual: { kind: 'list', title: 'Your information', items: ['Access your information', 'Download your information', 'Transfer a copy', 'Activity off Meta'], highlight: 1, alt: 'Download your information highlighted in the list' } },
    { type: 'step', number: 5, instruction: 'Select your account from the list.', visual: { kind: 'list', title: 'Select account', items: ['@yourhandle', 'Linked Facebook profile'], highlight: 0, alt: 'Account selection screen' } },
    { type: 'step', number: 6, instruction: 'Choose "Some of your information" rather than everything — it\'s faster.', visual: { kind: 'list', title: 'What to download', items: ['Some of your information', 'All of your information'], highlight: 0, alt: 'Choice between some and all information' }, tip: 'Downloading everything can take much longer and gives you a lot you don\'t need.' },
    { type: 'step', number: 7, instruction: 'Select only Messages from the list of information types.', visual: { kind: 'checks', title: 'Information types', items: [['Messages', true], ['Posts', false], ['Stories', false], ['Comments', false]], highlight: 0, alt: 'Information types with only Messages ticked' } },
    { type: 'step', number: 8, instruction: 'Set the format to JSON and pick a date range that covers the conversation.', visual: { kind: 'checks', title: 'Format and date', items: [['Format: JSON', true], ['Date range: All time', true], ['Media quality: Low', false]], highlight: 0, alt: 'Format set to JSON with a date range covering the conversation' } },
    { type: 'step', number: 9, instruction: 'Submit the request and wait for Instagram\'s notification that it\'s ready.', visual: { kind: 'status', icon: 'wait', title: 'Request submitted', body: 'Instagram will notify you when the file is ready', alt: 'Confirmation that the download request was submitted' } },
    { type: 'step', number: 10, instruction: 'Download the file, open the messages folder inside it, and upload the relevant conversation file to ThirdPerson AI.', visual: { kind: 'app', mode: 'upload', file: 'message_1.json', alt: 'The conversation file from the messages folder, ready to upload' } },
    { type: 'callout', tone: 'privacy', text: 'Your chats are analysed securely and never shared.' },
    { type: 'callout', tone: 'tip', text: 'Takes about 5 minutes to request, then a wait for Instagram. Upload the JSON file from the messages folder.' },
  ],
  'how-to-export-telegram-chat-history': [
    { type: 'callout', tone: 'note', text: 'Chat export is only available in Telegram Desktop. It is not available from the Telegram mobile app.' },
    { type: 'step', number: 1, instruction: 'Open Telegram Desktop on a computer. If you don\'t have it, it\'s a free download from telegram.org.', visual: { kind: 'desktopChat', frame: 'desktop', frameLabel: 'Telegram Desktop', alt: 'The Telegram Desktop window on a computer' } },
    { type: 'step', number: 2, instruction: 'Open the chat you want to analyse.', visual: { kind: 'desktopChat', frame: 'desktop', frameLabel: 'Telegram Desktop', name: 'Riya', alt: 'A chat opened in Telegram Desktop' } },
    { type: 'step', number: 3, instruction: 'Click the three dots ⋮ at the top of the chat.', visual: { kind: 'desktopChat', frame: 'desktop', frameLabel: 'Telegram Desktop', name: 'Riya', highlight: 'menu', alt: 'The three-dot menu at the top of the chat, highlighted' } },
    { type: 'step', number: 4, instruction: 'Click Export chat history.', visual: { kind: 'menu', frame: 'desktop', frameLabel: 'Telegram Desktop', title: 'Chat menu', items: ['Mute', 'Select messages', 'Clear history', 'Export chat history', 'Delete chat'], highlight: 3, alt: 'Export chat history highlighted in the chat menu' } },
    { type: 'step', number: 5, instruction: 'Untick Photos, Videos, and other media types — you only need the text.', visual: { kind: 'checks', frame: 'desktop', frameLabel: 'Telegram Desktop', title: 'Export settings', items: [['Photos', false], ['Videos', false], ['Voice messages', false], ['Files', false]], highlight: 0, back: false, note: 'Text only keeps the file small.', alt: 'Export settings with every media type unticked' }, tip: 'This keeps the file small and avoids uploading anything you don\'t need to.' },
    { type: 'step', number: 6, instruction: 'Choose JSON as the format. HTML also works if JSON isn\'t available in your version.', visual: { kind: 'list', frame: 'desktop', frameLabel: 'Telegram Desktop', title: 'Format', items: ['JSON', 'HTML'], highlight: 0, back: false, alt: 'Format selection with JSON chosen' } },
    { type: 'step', number: 7, instruction: 'Click Export and wait for Telegram to save the file to your computer.', visual: { kind: 'status', frame: 'desktop', frameLabel: 'Telegram Desktop', icon: 'wait', title: 'Exporting…', body: 'Telegram is writing the file to your computer', alt: 'Export progress in Telegram Desktop' } },
    { type: 'step', number: 8, instruction: 'Upload the exported file to ThirdPerson AI.', visual: { kind: 'app', mode: 'upload', file: 'result.json', alt: 'The Telegram export ready to upload to ThirdPerson AI' } },
    { type: 'callout', tone: 'privacy', text: 'Your chats are analysed securely and never shared.' },
    { type: 'callout', tone: 'tip', text: 'Takes about 2 minutes on a computer with Telegram Desktop installed.' },
  ],
  'how-to-export-imessage-chats': [
    { type: 'callout', tone: 'note', text: 'Apple does not provide an official way to export a full iMessage conversation as a file, so copy-paste is the most reliable option on a phone.' },
    { type: 'step', number: 1, instruction: 'Open the conversation in the Messages app.', visual: { kind: 'chat', name: 'Avery', alt: 'An open message conversation' } },
    { type: 'step', number: 2, instruction: 'Tap and hold on a message, then tap More to enter selection mode.', visual: { kind: 'menu', title: 'Message actions', items: ['Copy', 'Translate', 'Reply', 'More'], highlight: 3, alt: 'The message action menu with More highlighted' } },
    { type: 'step', number: 3, instruction: 'Tap each message you want to include, then tap the share icon to copy them.', visual: { kind: 'checks', title: 'Select messages', items: [['good morning', true], ['just reached', true], ['call me later', true]], highlight: 0, alt: 'Several messages selected ready to copy' } },
    { type: 'step', number: 4, instruction: 'Open ThirdPerson AI and paste the copied text directly into the paste box instead of uploading a file.', visual: { kind: 'app', mode: 'paste', alt: 'The ThirdPerson AI paste box with the copied text in it' } },
    { type: 'step', number: 5, instruction: 'For a longer conversation, repeat this for each section and paste them in chronological order.', tip: 'Keeping the order intact matters more than getting every single message — a representative stretch of the conversation is enough.' },
    { type: 'paragraph', text: 'If you use a Mac, the Messages app there allows you to select and copy a longer stretch of conversation at once, which can be faster than doing it message-by-message on a phone.' },
    { type: 'callout', tone: 'privacy', text: 'Your chats are analysed securely and never shared.' },
    { type: 'callout', tone: 'tip', text: 'Takes about 2 minutes. Paste the text — there is no file to upload for this method.' },
  ],
  'how-to-export-messenger-chats': [
    { type: 'callout', tone: 'note', text: 'Messenger is part of the same Meta data-download tool as Instagram, so if you\'ve exported an Instagram chat before, this will feel familiar.' },
    { type: 'step', number: 1, instruction: 'Go to your Facebook or Messenger Accounts Centre information export settings.', visual: { kind: 'list', title: 'Settings', items: ['Accounts Centre', 'Privacy', 'Notifications'], highlight: 0, alt: 'Settings with Accounts Centre highlighted' } },
    { type: 'step', number: 2, instruction: 'Request a copy or export of your information.', visual: { kind: 'list', title: 'Your information', items: ['Download your information', 'Transfer a copy', 'Access your information'], highlight: 0, alt: 'Download your information highlighted' } },
    { type: 'step', number: 3, instruction: 'Select Messages from the list of information types.', visual: { kind: 'checks', title: 'Information types', items: [['Messages', true], ['Posts', false], ['Friends', false]], highlight: 0, alt: 'Information types with only Messages ticked' } },
    { type: 'step', number: 4, instruction: 'Choose your date range and set the format to JSON.', visual: { kind: 'checks', title: 'Format and date', items: [['Format: JSON', true], ['Date range: All time', true]], highlight: 0, alt: 'Format set to JSON with a date range chosen' } },
    { type: 'step', number: 5, instruction: 'Submit the request and download the file once Meta notifies you it\'s ready.', visual: { kind: 'status', icon: 'wait', title: 'Request submitted', body: 'Meta will notify you when the file is ready', alt: 'Confirmation that the export request was submitted' } },
    { type: 'step', number: 6, instruction: 'Open the downloaded file and upload the relevant conversation to ThirdPerson AI.', visual: { kind: 'app', mode: 'upload', file: 'message_1.json', alt: 'The Messenger export ready to upload to ThirdPerson AI' } },
    { type: 'callout', tone: 'privacy', text: 'Your chats are analysed securely and never shared.' },
    { type: 'callout', tone: 'tip', text: 'Takes about 5 minutes to request, then a short wait for Meta to prepare it.' },
  ],
  'how-to-export-snapchat-chats': [
    { type: 'callout', tone: 'note', text: 'Snapchat may not include messages that already disappeared or were never saved by either person — it can only export what Snapchat still has a record of.' },
    { type: 'step', number: 1, instruction: 'Open Snapchat and go to Settings, then My Data.', visual: { kind: 'list', title: 'Settings', items: ['My Account', 'My Data', 'Privacy Controls', 'Notifications'], highlight: 1, alt: 'Settings list with My Data highlighted' } },
    { type: 'step', number: 2, instruction: 'Request your data.', visual: { kind: 'dialog', title: 'My Data', body: 'Export a copy of your account data', actions: ['Submit Request'], highlight: 0, alt: 'The submit request button on the My Data screen' } },
    { type: 'step', number: 3, instruction: 'If given the option, select chat or message history specifically.', visual: { kind: 'checks', title: 'Select data', items: [['Chat history', true], ['Memories', false], ['Account info', false]], highlight: 0, alt: 'Data types with chat history ticked' } },
    { type: 'step', number: 4, instruction: 'Submit the request and wait for Snapchat to prepare your file — you\'ll get a notification.', visual: { kind: 'status', icon: 'wait', title: 'Request submitted', body: 'Snapchat will email you when it is ready', alt: 'Confirmation that the data request was submitted' } },
    { type: 'step', number: 5, instruction: 'Download the prepared file and upload the relevant part to ThirdPerson AI.', visual: { kind: 'app', mode: 'upload', file: 'chat_history.json', alt: 'The Snapchat data file ready to upload to ThirdPerson AI' } },
    { type: 'callout', tone: 'privacy', text: 'Your chats are analysed securely and never shared.' },
    { type: 'callout', tone: 'tip', text: 'Takes about 5 minutes to request, then a short wait for Snapchat to prepare it.' },
  ],
  'the-science-of-marriage-success': [
    { type: 'paragraph', text: 'In the 1990s, psychologist John Gottman set up what he called a "Love Lab" at the University of Washington. Couples would spend time in an apartment-like observation suite while researchers tracked their conversations, heart rates, and facial expressions down to the smallest muscle twitch. The goal was simple: figure out what actually separates couples who stay together from couples who don\'t.' },
    { type: 'paragraph', text: 'The results were so consistent that Gottman could predict, with over 90% accuracy in some studies, which couples would divorce within a few years — just by watching how they argued for a few minutes. Not what they argued about. How.' },
    { type: 'heading', level: 2, text: 'The 5:1 ratio' },
    { type: 'paragraph', text: 'One of Gottman\'s most-cited findings is what\'s often called the "magic ratio": stable, happy couples maintain roughly five positive interactions for every one negative interaction during conflict. This doesn\'t mean five compliments for every criticism in daily life — it specifically applies to how couples behave while actually disagreeing.' },
    { type: 'paragraph', text: 'A positive interaction can be small: a moment of humour in the middle of tension, a validating "I get why you\'re upset," physical affection, or genuine curiosity about the other person\'s point of view. Couples heading toward divorce, by contrast, tend to drop toward a 1:1 ratio or worse — every criticism is met with an equal or greater negative response, with no positivity to buffer it.' },
    { type: 'callout', tone: 'note', text: 'The ratio matters more during conflict than during calm moments — it is specifically about how a couple handles disagreement, not how often they say nice things in general.' },
    { type: 'heading', level: 2, text: 'The Four Horsemen' },
    { type: 'paragraph', text: 'Gottman named four communication patterns "the Four Horsemen of the Apocalypse" because of how reliably they predict relationship breakdown when they become habitual.' },
    { type: 'list', items: [
      'Criticism — attacking someone\'s character rather than addressing a specific behaviour ("You never think about anyone but yourself" instead of "I felt hurt that you forgot to call").',
      'Contempt — mockery, sarcasm, eye-rolling, or name-calling that communicates disgust or superiority. Gottman found this to be the single strongest predictor of divorce.',
      'Defensiveness — responding to a concern with self-protection and counter-blame instead of hearing it ("Well, you do it too" instead of acknowledging the point).',
      'Stonewalling — shutting down and withdrawing from the conversation entirely, often as a response to feeling physiologically overwhelmed.',
    ] },
    { type: 'paragraph', text: 'These four rarely appear alone — they tend to escalate in sequence. Criticism invites defensiveness, defensiveness invites contempt, and contempt eventually pushes one partner into stonewalling just to cope with the intensity.' },
    { type: 'heading', level: 2, text: 'What this has to do with your text messages' },
    { type: 'paragraph', text: 'Gottman\'s research was built on in-person conversation, but the same underlying patterns show up in text — often more visibly, because text leaves a written record. A pattern of one-word replies after a disagreement can be a form of stonewalling. A message like "must be nice to only think about yourself" is textbook criticism. Sarcastic replies with no warmth underneath are contempt in text form.' },
    { type: 'paragraph', text: 'This is exactly the kind of pattern ThirdPerson AI is built to surface. A single message rarely tells you much. But looking across weeks or months of a real conversation — how often repair attempts happen after conflict, how balanced the effort is, whether warmth returns after tension — starts to resemble the same signal Gottman spent decades studying in person, just visible in the chat history you already have.' },
    { type: 'heading', level: 2, text: 'What actually helps' },
    { type: 'paragraph', text: 'Gottman\'s more hopeful finding is that the Four Horsemen aren\'t fatal on their own — what matters is whether a couple has "repair attempts" that work. A repair attempt is any effort to de-escalate: a joke, an apology, a hand reaching out, a simple "can we start over?" Couples who stay together aren\'t the ones who never fight. They\'re the ones whose repair attempts land, and who keep making them.' },
    { type: 'callout', tone: 'tip', text: 'If you want to see these patterns in your own conversations, upload a chat to ThirdPerson AI — the report looks specifically for effort balance, repair patterns, and recurring conflict signals.' },
  ],
  'texting-habits-relationship-health': [
    { type: 'paragraph', text: 'Nobody\'s relationship is judged fairly by a single text message taken out of context. But patterns, repeated over weeks and months, tell a much more honest story than any one conversation can. Here are ten habits worth noticing in your own chat history.' },
    { type: 'heading', level: 2, text: '1. Who initiates, and how often' },
    { type: 'paragraph', text: 'If one person is almost always the one to say "hey" first, it\'s worth asking why. Occasional imbalance is normal — consistent one-sided initiation over months is a pattern worth naming.' },
    { type: 'heading', level: 2, text: '2. Response time under normal circumstances' },
    { type: 'paragraph', text: 'Busy people are still busy people, and slow replies aren\'t automatically a red flag. But a consistent, growing gap in response time — especially after it used to be quick — often reflects a shift in priority or interest before either person says it out loud.' },
    { type: 'heading', level: 2, text: '3. How repair happens after a disagreement' },
    { type: 'paragraph', text: 'Every relationship has friction. The healthier pattern isn\'t the absence of conflict — it\'s what happens in the hour or day afterward. Does someone reach out first? Is there a joke that breaks the tension? Or does the silence just stretch until it\'s quietly forgotten (and quietly unresolved)?' },
    { type: 'heading', level: 2, text: '4. Effort balance in the little things' },
    { type: 'paragraph', text: 'Who remembers to ask "how did that thing go?" the next day? Who follows up on the small details the other person mentioned in passing? This kind of effort is easy to miss in the moment but adds up clearly over a long chat history.' },
    { type: 'heading', level: 2, text: '5. One-word replies during otherwise normal conversation' },
    { type: 'paragraph', text: 'Context matters — a one-word reply during a busy day is nothing. A pattern of one-word replies specifically after certain topics come up (commitment, plans, feelings) is a more specific signal.' },
    { type: 'heading', level: 2, text: '6. How mixed signals get handled' },
    { type: 'paragraph', text: 'Healthy communication tends to name confusion directly ("I wasn\'t sure what you meant by that") rather than letting it sit and fester into assumption.' },
    { type: 'heading', level: 2, text: '7. Humour that lands vs. humour that doesn\'t' },
    { type: 'paragraph', text: 'Shared humour is one of the strongest glue points in any relationship. Sarcasm that consistently has an edge to it — the kind that gets a "lol" but not an actual laugh — is a different thing entirely, and worth telling apart from playful teasing.' },
    { type: 'heading', level: 2, text: '8. Whether apologies actually happen' },
    { type: 'paragraph', text: 'Not every disagreement needs a formal apology, but a pattern where one person never acknowledges being in the wrong — even lightly — tends to leave the other person carrying more than their share.' },
    { type: 'heading', level: 2, text: '9. Emoji and affection language over time' },
    { type: 'paragraph', text: 'A gradual drop in warmth markers — emoji, pet names, "good morning" texts — isn\'t proof of anything by itself, but it\'s a genuinely useful trendline to notice rather than dismiss.' },
    { type: 'heading', level: 2, text: '10. Consistency between words and plans' },
    { type: 'paragraph', text: 'Does "we should hang out soon" turn into an actual plan, or does it stay a nice sentence that never becomes a date on the calendar? Intentions are easy to text. Follow-through is the pattern that actually matters.' },
    { type: 'callout', tone: 'tip', text: 'These patterns are much easier to see across months of messages than in your memory of a few conversations — which is exactly what a chat analysis is built to surface.' },
  ],
  'why-we-fight-over-text': [
    { type: 'paragraph', text: 'A message that would sound perfectly neutral out loud can read as cold, sarcastic, or angry in text. This isn\'t a flaw in how you communicate — it\'s a predictable gap in how text works as a medium, and understanding it can defuse a surprising number of arguments before they start.' },
    { type: 'heading', level: 2, text: 'Text removes almost everything except the words' },
    { type: 'paragraph', text: 'In person, meaning comes from tone of voice, facial expression, timing, and body language as much as from the actual words used. Researchers estimate that a large share of emotional meaning in face-to-face communication comes from these non-verbal channels. Text strips nearly all of it away, leaving just the words — and words alone are a surprisingly ambiguous way to convey emotion.' },
    { type: 'paragraph', text: '"Sure, whatever works" can be relaxed agreement or quiet resentment, and the words on the screen look identical either way.' },
    { type: 'heading', level: 2, text: 'Your brain fills the gap with whatever you already expect' },
    { type: 'paragraph', text: 'When information is ambiguous, people don\'t sit in uncertainty — they fill in the missing tone with whatever their brain already predicts. If you\'re already anxious about where a relationship stands, a short reply reads as distance. If you already feel criticised, a neutral comment reads as another dig. This is sometimes called negative sentiment override: once a relationship enters a slightly negative frame, ambiguous messages get interpreted negatively by default, which then reinforces the negative frame — a feedback loop that\'s easy to fall into and hard to notice from inside it.' },
    { type: 'heading', level: 2, text: 'Timing carries meaning that was never intended' },
    { type: 'paragraph', text: 'A reply that comes twelve hours later might mean someone was in back-to-back meetings, asleep, or genuinely didn\'t know what to say. But the person waiting rarely experiences it that way in the moment — the gap itself becomes information, whether or not it was meant to be.' },
    { type: 'heading', level: 2, text: 'Punctuation and length do a lot of uninvited work' },
    { type: 'paragraph', text: 'A period at the end of a short text can read as clipped or annoyed, even when it\'s just habitual grammar. A long, detailed message can read as caring or as over-explaining, depending entirely on the mood of the person reading it. None of this is really about grammar — it\'s about the reader\'s state of mind doing the interpreting.' },
    { type: 'heading', level: 2, text: 'What actually helps' },
    { type: 'list', items: [
      'Naming the ambiguity out loud ("that came across a bit flat to me, is everything okay?") instead of assuming the worst reading and reacting to it.',
      'Moving genuinely important or emotionally loaded conversations to a call rather than resolving them entirely over text.',
      'Noticing your own state before reading a message — if you\'re already stressed or anxious, that\'s worth accounting for before deciding what a message "really means".',
      'Looking at the pattern over time rather than any single message — one flat reply means very little; a consistent pattern of them means more.',
    ] },
    { type: 'paragraph', text: 'This last point is where a proper chat analysis becomes genuinely useful. A single confusing message is nearly impossible to interpret fairly on its own. A pattern across weeks or months — response time trends, recurring flags, how conflict actually gets repaired — tells a much more honest story than any one text ever could.' },
    { type: 'callout', tone: 'tip', text: 'If a conversation keeps leaving you unsure what someone actually meant, a full chat analysis often makes the pattern much clearer than re-reading the same messages again.' },
  ],
};

export function getBlogContentBySlug(slug) {
  return BLOG_CONTENT[slug] || null;
}
