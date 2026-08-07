
const updated = new Intl.DateTimeFormat('en-IN', { dateStyle: 'long' }).format(new Date());

const policySections = [
  ['Information we process', 'ThirdPerson AI may process account information if a user provides it in the future, conversation data uploaded or pasted for analysis, information about the other participant in the conversation, usage and device information, derived insights generated from analysis, personality traits and communication patterns, and feedback or support messages. Conversations are prepared in your browser and then analysed server-side through ThirdPerson AI’s own backend, which calls our AI provider. The conversation is not retained after your report is generated.'],
  ['Conversation data', 'Conversation data may include personal messages, names, dates, emotional content, and information about third parties. Users should only upload conversations they have a reasonable right or permission to analyse.'],
  ['The conversation itself is discarded after analysis', 'Your uploaded or pasted conversation is used to generate your report and is then discarded. We do not keep the transcript. What remains attached to your report is the analysis itself, aggregate statistics that cannot reconstruct the conversation (message counts, activity per month, word and emoji frequencies), and the short quotes the report cites as evidence for a specific insight. Those quotes are genuine excerpts from the conversation, deliberately kept so every finding can be traced to something real — deleting the report deletes them with it.'],
  ['Non-user participant data', 'Uploaded conversations may include messages from people who are not ThirdPerson AI users. The uploader is responsible for ensuring they have a reasonable basis to upload and analyse that content.'],
  ['How we use information', 'We use information to generate relationship analysis, identify communication patterns, create emotional timelines, generate compatibility and personality insights, improve user experience, provide support, maintain safety, prevent misuse, and develop better product features.'],
  ['Multi-language analysis', 'ThirdPerson AI may process conversations in any of the languages listed on your Profile page — including mixed-language chats and languages typed phonetically in the English alphabet, such as Hinglish — to understand tone, emotional context, repeated phrases, and communication patterns.'],
  ['AI processing', 'Conversation data may be sent to an AI processing layer to generate analysis. ThirdPerson AI prepares conversations carefully, protects sensitive details where possible, and uses the chat only to generate relationship insights.'],
  ['Where analysis is processed', 'All Relationship Reports, Coach Chats, and Personality Cards are generated only through ThirdPerson AI\'s own backend, which calls our AI provider (OpenAI) server-side. Sensitive-detail protection is applied to your conversation before it is sent for analysis.'],
  ['Conversation safety preparation', 'The app checks uploaded or pasted chats for unnecessary technical noise, secret-looking content, and private details. This helps keep the analysis focused on the relationship patterns that matter.'],
  ['Derived insights', 'The app may generate communication style, emotional patterns, compatibility indicators, red flag and green flag observations, MBTI-like personality descriptions, personality card insights, engagement psychology signals, and recurring language patterns. These insights are interpretive and probabilistic. They are reflection tools, not proof or final judgment.'],
  ['Data retention', 'Your generated reports, personality profiles and coach messages are stored in your account so you can reopen them later, and are kept until you delete them. The uploaded conversation behind a report is not kept — see “The conversation itself is discarded after analysis” above. You can delete any single report, or wipe every analysis, personality profile and coach message, from your Profile page at any time; deletion is immediate and removes the stored quotes along with the report.'],
  ['Data sharing', 'ThirdPerson AI does not sell personal conversation data. Conversation content may be processed by service providers only where needed to provide analysis. We do not claim storage or encryption guarantees beyond what is actually implemented in the product.'],
  ['Security', 'We use reasonable technical and organisational safeguards. However, no internet-based system can be guaranteed to be 100% secure.'],
  ['User choices', 'Do not upload conversations you are not comfortable analysing. Remove sensitive details before upload if desired. Use paste mode with edited text if preferred. Request deletion when account storage is available. Contact support for privacy questions.'],
  ['Children’s privacy', 'ThirdPerson AI is not intended for children under 16.'],
  ['Responsible and prohibited use', 'The app must not be used for manipulation, stalking, harassment, surveillance, emotional control, coercion, blackmail, threats, abuse, or making final judgments about another person.'],
  ['International processing', 'AI and technical service providers may process data in different countries depending on infrastructure and provider configuration.'],
  ['Changes to policy', 'This policy may be updated as the product evolves. Material changes will be reflected on this page.'],
  ['Contact', 'For privacy questions, contact legal@thethirdperson.ai. For support, contact support@thethirdperson.ai.'],
];

export default function PrivacyPage() {
  return (
    <section className="relative min-h-screen overflow-hidden px-4 pb-16 pt-28 sm:px-8">
      <div className="relative mx-auto max-w-[1320px]">
        <div className="corner-frame accent-panel p-6 sm:p-12">
          <p className="tech-label text-smoke">Privacy Policy</p>
          <h1 className="serif-title mt-5 max-w-4xl text-5xl leading-tight sm:text-7xl">Privacy is central to ThirdPerson AI.</h1>
          <p className="mt-3 text-xs text-purple-700">Last updated: {updated}</p>
          <p className="mt-6 max-w-3xl text-sm leading-8 text-smoke">
            Conversations can contain deeply personal information, including messages from people who are not using the app. This Privacy Policy explains what information may be processed, how it is used, how we protect it, and what choices users have.
          </p>
        </div>

        <div className="mt-6 grid gap-4 md:grid-cols-4">
          {['Private by design', 'Chats treated as sensitive', 'AI insights are interpretive', 'Human judgment matters'].map((item) => (
            <div key={item} className="thin-panel p-5">
              <p className="tech-label text-purple-700">{item}</p>
            </div>
          ))}
        </div>

        <div className="mt-8 grid gap-8 lg:grid-cols-[280px_1fr]">
          <aside className="hidden h-fit border border-purple-200 bg-well p-5 lg:sticky lg:top-28 lg:block">
            <p className="tech-label mb-4 text-smoke">Policy sections</p>
            <div className="space-y-2">
              {policySections.map(([title], index) => (
                <a key={title} href={`#privacy-${index}`} className="block text-sm leading-6 text-ash transition hover:text-bone">
                  {String(index + 1).padStart(2, '0')} {title}
                </a>
              ))}
            </div>
          </aside>
          <div className="space-y-5">
            {policySections.map(([title, body], index) => (
              <section id={`privacy-${index}`} key={title} className="thin-panel scroll-mt-28 p-6">
                <p className="tech-label text-purple-700">{String(index + 1).padStart(2, '0')}</p>
                <h2 className="serif-title mt-3 text-3xl">{title}</h2>
                <p className="mt-4 text-sm leading-8 text-smoke">{body}</p>
              </section>
            ))}
          </div>
        </div>
      </div>
    </section>
  );
}
