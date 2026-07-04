function clamp(value, min = 8, max = 96) {
  return Math.max(min, Math.min(max, Math.round(value)));
}

function seeded(input = '') {
  let hash = 0;
  for (let i = 0; i < input.length; i += 1) hash = (hash * 31 + input.charCodeAt(i)) % 9973;
  return hash;
}

const positive = ['care', 'love', 'trust', 'honest', 'respect', 'please', 'promise', 'stay'];
const tense = ['hurt', 'angry', 'fight', 'ignored', 'never', 'blocked', 'lie', 'distant', 'jealous', 'breakup'];

function wordCount(words, list) {
  return words.reduce((sum, item) => sum + (list.includes(item.word) ? item.count : 0), 0);
}

function makeTimeline(prepared, baseScores) {
  const moments = prepared.importantMoments.length ? prepared.importantMoments : [
    { period: 'Phase 1', text: 'Conversation begins with neutral exchange.', speaker: 'You' },
    { period: 'Phase 2', text: 'A recurring emotional question appears.', speaker: prepared.metadata.personName },
    { period: 'Phase 3', text: 'Both sides look for more clarity.', speaker: 'You' },
  ];

  return Array.from({ length: 10 }, (_, index) => {
    const source = moments[index % moments.length];
    const scoreShift = (index - 4) * 2 + (source.emotionalWeight || 1);
    const sentiment = scoreShift > 7 ? 'warm' : scoreShift < -1 ? 'tense' : 'mixed';
    return {
      period: source.period || `Phase ${index + 1}`,
      title: ['Signal Emerges', 'Context Builds', 'Emotional Shift', 'Repair Attempt', 'Clarity Gap'][index % 5],
      sentiment,
      compatibility: clamp(baseScores.compatibility + scoreShift - 8, 12, 94),
      quote: source.text?.slice(0, 140) || 'Representative quote unavailable.',
      happened: `The conversation appears to surface a ${sentiment} relational signal around ${source.speaker || 'one participant'}.`,
      why: 'This matters because repeated emotional signals often reveal where clarity, reassurance, or boundaries may be needed.',
    };
  });
}

function buildFlags(tension, positiveCount, personName) {
  const redFlags = [
    {
      label: 'Recurring uncertainty',
      severity: tension > 8 ? 'High' : 'Medium',
      explanation: 'Repeated words around confusion, distance, or unresolved tension may suggest an unstable communication loop.',
      whyItMatters: 'This may be worth paying attention to because uncertainty can make small issues feel much heavier over time.',
      reflectionQuestion: 'What part of the conversation needs a clearer answer instead of another guess?',
    },
    {
      label: 'Avoidance pattern',
      severity: tension > 5 ? 'Medium' : 'Low',
      explanation: 'Some exchanges appear to move away from direct repair instead of naming the issue clearly.',
      whyItMatters: 'Avoidance does not prove intent, but it may show where both people are struggling to be direct.',
      reflectionQuestion: 'What would feel safe to ask directly, without blame?',
    },
  ];

  const greenFlags = [
    {
      label: 'Care is still visible',
      explanation: `The conversation includes signals that may suggest ${personName} or the user still values emotional connection.`,
      whyItMatters: 'A possible positive sign is that care language can create room for repair when both people are willing.',
      howToBuildOnIt: 'Name the care you notice, then ask for one small, specific next step.',
    },
    {
      label: 'Repair language exists',
      explanation: 'Words like sorry, please, honest, or explain can indicate willingness to clarify rather than fully withdraw.',
      whyItMatters: 'Repair language can help turn emotional tension into a calmer conversation.',
      howToBuildOnIt: 'Build on repair attempts by keeping the next conversation short, clear, and kind.',
    },
  ];

  if (positiveCount > tension) {
    greenFlags.unshift({
      label: 'Warmth outweighs tension',
      explanation: 'Supportive language appears more often than high-conflict language in this sample.',
      whyItMatters: 'This could suggest there is still emotional goodwill to work with.',
      howToBuildOnIt: 'Use that warmth to ask for clarity instead of escalating the same loop.',
    });
  } else {
    redFlags.unshift({
      label: 'Tension outweighs reassurance',
      severity: 'Medium',
      explanation: 'Conflict-oriented language appears more strongly than repair-oriented language.',
      whyItMatters: 'This does not prove intent, but it may show a pattern where reassurance arrives too late or too softly.',
      reflectionQuestion: 'What kind of reassurance would actually help, and has it been asked for clearly?',
    });
  }

  return { redFlags: redFlags.slice(0, 4), greenFlags: greenFlags.slice(0, 4) };
}

function buildDayNightDynamics(prepared = {}) {
  const breakdown = prepared.dailyNightBreakdown || [
    { period: 'Day', count: 0, percentage: 0, affectionSignals: 0, tensionSignals: 0, emotionalIntensity: 0 },
    { period: 'Evening', count: 0, percentage: 0, affectionSignals: 0, tensionSignals: 0, emotionalIntensity: 0 },
    { period: 'Night', count: 0, percentage: 0, affectionSignals: 0, tensionSignals: 0, emotionalIntensity: 0 },
  ];
  const by = (key) => [...breakdown].sort((a, b) => (b[key] || 0) - (a[key] || 0))[0] || breakdown[0];
  const mostActive = by('count');
  const warmest = by('affectionSignals');
  const highestTension = by('tensionSignals');
  const deepest = by('emotionalIntensity');
  return {
    mostActivePeriod: mostActive.period,
    warmestPeriod: warmest.period,
    highestTensionPeriod: highestTension.period,
    deepestConversationPeriod: deepest.period,
    volumeByPeriod: breakdown.map(({ period, count, percentage }) => ({ period, count, percentage })),
    affectionByPeriod: breakdown.map(({ period, affectionSignals }) => ({ period, count: affectionSignals || 0 })),
    tensionByPeriod: breakdown.map(({ period, tensionSignals }) => ({ period, count: tensionSignals || 0 })),
    interpretation: `${deepest.period} conversations appear to carry more emotional intensity, while ${warmest.period.toLowerCase()} messages show the strongest warmth signals in this sample.`,
    rawBreakdown: breakdown,
  };
}

export function generateRelationshipAnalysis(input = {}) {
  const prepared = input.preparedConversation || input;
  const meta = prepared.metadata || {};
  const topWords = prepared.topWords || [];
  const seed = seeded(`${meta.platform}${meta.relationshipType}${meta.personName}${prepared.messageCount}${topWords.map((w) => w.word).join('')}`);
  const positiveCount = wordCount(topWords, positive);
  const tensionCount = wordCount(topWords, tense);
  const volumeBoost = Math.min(10, (prepared.messageCount || 0) / 18);
  const riskPenalty = input.promptRiskLevel === 'high' ? 9 : input.promptRiskLevel === 'medium' ? 5 : 0;

  const compatibility = clamp(58 + positiveCount * 2 - tensionCount * 2 + (seed % 13) - riskPenalty);
  const communicationHealth = clamp(56 + volumeBoost + positiveCount - tensionCount * 1.5);
  const emotionalSafety = clamp(62 + positiveCount * 1.5 - tensionCount * 2.4 - riskPenalty);
  const effortBalance = clamp(52 + ((prepared.participantNames?.length || 1) > 1 ? 8 : -3) + (seed % 9));
  const trustSignal = clamp(55 + positiveCount * 2 - tensionCount * 1.2);
  const conflictIntensity = clamp(35 + tensionCount * 6 - positiveCount + (seed % 12), 4, 94);
  const clarity = clamp(50 + topWords.filter((w) => ['explain', 'honest', 'clear', 'clarity', 'talk'].includes(w.word)).length * 8 - tensionCount);

  const scores = {
    compatibility,
    communicationHealth,
    emotionalSafety,
    effortBalance,
    trustSignal,
    conflictIntensity,
    clarity,
  };

  const relationshipLabel = meta.relationshipType || 'relationship';
  const personName = meta.personName || 'Their';
  const selectedOtherPerson = meta.selectedOtherPerson || personName;
  const participants = prepared.participants || prepared.participantNames || [];
  const pattern = tensionCount > positiveCount ? 'an unresolved tension-and-reassurance cycle' : 'a careful search for clarity with visible warmth';
  const { redFlags, greenFlags } = buildFlags(tensionCount, positiveCount, personName);
  const timeline = makeTimeline(prepared, scores);
  const words = topWords.length ? topWords : [
    { word: 'talk', count: 6 }, { word: 'care', count: 5 }, { word: 'feel', count: 4 }, { word: 'time', count: 3 },
  ];

  return {
    participants: {
      detectedParticipants: participants,
      selectedOtherPerson,
      likelyMainUser: meta.likelyMainUser || participants.find((name) => name !== selectedOtherPerson) || participants[0] || 'You',
      messageCountByParticipant: prepared.senderStats || [],
    },
    summary: {
      relationshipOverview: `Based on the provided ${meta.platform || 'chat'} conversation, this ${relationshipLabel} dynamic appears emotionally meaningful but not fully settled.`,
      currentDynamic: `The exchange with ${personName} may suggest ${pattern}.`,
      mainEmotionalPattern: tensionCount > positiveCount ? 'Closeness followed by withdrawal, then attempts to regain certainty.' : 'Cautious honesty, reassurance seeking, and a desire to understand each other better.',
      importantCaveat: 'This is an interpretive relationship intelligence summary. It cannot know offline context, intent, tone, or the full reality of either person.',
    },
    scores,
    timeline,
    sentimentStoryboard: timeline.slice(0, 7).map((item, index) => ({
      period: item.period,
      emotion: ['Curious', 'Guarded', 'Tender', 'Tense', 'Reflective', 'Hopeful', 'Unclear'][index],
      intensity: clamp(item.compatibility - 18 + index * 3, 12, 92),
      explanation: `The language in this period appears ${item.sentiment}, with relationship clarity around ${item.compatibility}/100.`,
    })),
    engagementAnalysis: {
      userEngagement: clamp(58 + positiveCount * 3 + (seed % 10)),
      otherPersonEngagement: clamp(54 + effortBalance / 4 - tensionCount * 2 + (seed % 8)),
      balance: effortBalance > 62 ? 'Mostly balanced' : 'Somewhat uneven',
      notablePatterns: [
        'One side appears to seek definition while the other may need time before answering directly.',
        'Emotional terms cluster around key moments rather than appearing evenly across the conversation.',
        'Repair signals exist, but they compete with ambiguity and guarded phrasing.',
      ],
    },
    communicationPatterns: {
      userStyle: 'Direct, meaning-seeking, emotionally observant.',
      otherPersonStyle: 'Measured, selective, and occasionally indirect.',
      conflictStyle: conflictIntensity > 62 ? 'Conflict may escalate through silence or repeated clarification attempts.' : 'Conflict appears contained but still emotionally present.',
      repairAttempts: 'Apologies, explanations, or softer language appear as possible repair attempts.',
      avoidancePatterns: 'Ambiguous phrases and delayed clarity may indicate avoidance or uncertainty.',
    },
    redFlags,
    greenFlags,
    improvedRedFlags: redFlags,
    improvedGreenFlags: greenFlags,
    dayNightDynamics: buildDayNightDynamics(prepared),
    zodiacCompatibility: meta.zodiacCompatibility || {
      userSign: meta.userProfile?.zodiacSign || '',
      userGlyph: meta.userProfile?.zodiacSign ? '✦' : '',
      userElement: meta.userProfile?.zodiacElement || '',
      otherSign: meta.otherPersonZodiac?.sign || '',
      otherGlyph: meta.otherPersonZodiac?.glyph || '',
      otherElement: meta.otherPersonZodiac?.element || '',
      interpretation: meta.userProfile?.zodiacSign || meta.otherPersonZodiac?.sign
        ? 'The zodiac layer can be fun to reflect on, but this report gives more weight to the actual messages, effort, clarity, and emotional safety visible in the conversation.'
        : 'Add date of birth details to unlock a light zodiac reflection layer.',
      conversationLayer: `The conversation itself points more strongly toward ${pattern}.`,
      disclaimer: 'Zodiac insights are for reflection and fun. The actual conversation patterns matter more than the sign match.',
    },
    relationshipSpecificInsights: [
      relationshipLabel.toLowerCase().includes('friend')
        ? 'The conversation may be worth reading through support, effort balance, and emotional availability.'
        : relationshipLabel.toLowerCase().includes('manager') || relationshipLabel.toLowerCase().includes('client') || relationshipLabel.toLowerCase().includes('colleague')
          ? 'The conversation may be best understood through clarity, boundaries, response balance, and pressure signals.'
          : relationshipLabel.toLowerCase().includes('mom') || relationshipLabel.toLowerCase().includes('dad') || relationshipLabel.toLowerCase().includes('family')
            ? 'The conversation may carry care, expectations, responsibility, and boundary signals at the same time.'
            : 'The conversation may be worth reading through affection, consistency, clarity, hesitation, and emotional safety.',
      'This analysis uses careful language because chat history can show patterns, not the full truth of a relationship.',
    ],
    simpleSummaryForYoungAudience: `The main vibe appears to be ${pattern}. There are signs worth reflecting on, but nothing here should be treated as final proof.`,
    bestieBreakdown: {
      whatItLooksLike: `This looks like ${pattern}. There is care in the chat, but clarity seems to come and go.`,
      whatItMayMean: 'It may mean both people feel something, but the way it is expressed is not always consistent or easy to trust.',
      whatNotToIgnore: tensionCount > positiveCount ? 'Do not ignore repeated distance, unclear answers, or moments where one person carries most of the emotional work.' : 'Do not ignore the good signs, but still notice where clarity is missing.',
      whatToDoNext: `Ask ${personName} one calm question about what they actually want and what they can show through actions.`,
    },
    energyMatchScore: {
      score: effortBalance,
      userEnergy: 'Reflective, emotionally present, and clarity-seeking.',
      otherPersonEnergy: effortBalance > 62 ? 'Responsive enough to keep the conversation moving.' : 'A little harder to read and sometimes less direct.',
      effortBalance: effortBalance > 62 ? 'The energy looks mostly balanced.' : 'The energy may feel uneven in a few moments.',
      emotionalAvailability: emotionalSafety > 60 ? 'There are signs of openness.' : 'Emotional availability may feel inconsistent.',
      consistency: clarity > 60 ? 'The conversation has some stable signals.' : 'Consistency may be the main thing to watch.',
      explanation: 'This score reflects how balanced the effort, warmth, and clarity appear in the uploaded chat.',
    },
    mixedSignalsMap: {
      warmSignals: greenFlags.map((flag) => flag.label).slice(0, 3),
      distantSignals: redFlags.map((flag) => flag.label).slice(0, 3),
      confusingSignals: ['Care appears, but timing or clarity may feel inconsistent.'],
      stableSignals: ['There are moments where repair or honesty appears possible.'],
      bestieNote: 'Mixed signals are not proof of bad intent, but they can still be emotionally exhausting.',
    },
    attachmentVibe: {
      userCommunicationVibe: 'Clarity-seeking and emotionally observant.',
      otherCommunicationVibe: tensionCount > positiveCount ? 'Guarded or slower to explain feelings.' : 'Warm but sometimes inconsistent.',
      dynamicCreated: 'This may create a loop where one person asks for clarity while the other needs more space or time.',
      howToCommunicateBetter: 'Keep the conversation direct, short, and emotionally honest. Ask for actions, not just explanations.',
      disclaimer: 'This is a reflective read, not a fixed label.',
    },
    turningPoints: timeline.slice(0, 2).map((item) => ({
      title: item.title,
      period: item.period,
      whatChanged: `The tone appears to become more ${item.sentiment}.`,
      whyItMatters: item.why,
      quote: item.quote,
    })),
    friendsWouldNotice: {
      theyWouldNotice: 'They would probably notice that you are trying to understand the emotional truth, not just win the conversation.',
      theyMightWarnYouAbout: 'They might warn you not to carry the whole connection alone.',
      theyMightRemindYou: 'They might remind you that care should feel clearer in actions, not only in words.',
    },
    screenshotWorthySummary: `This connection feels emotionally real, but the effort may not always feel even. There are signs of care, but also moments where clarity disappears and one person starts carrying more of the emotional weight.`,
    communicationStyleSignals: {
      disclaimer: 'This is a reflective read, not a fixed label. It only reflects communication patterns visible in the uploaded conversation.',
      user: {
        traitIntensity: 'medium',
        attentionStyleSignals: ['Notices small shifts in tone', 'Looks for meaning under short replies'],
        emotionalProcessingStyle: 'Reflective and detail-aware',
        socialEnergyPattern: 'More engaged when the conversation feels emotionally safe',
        routineOrConsistencySignals: ['May need steady communication to feel secure'],
        possibleOverwhelmSignals: ['Can overthink unclear replies when emotions are high'],
        communicationTips: ['Ask directly before assuming', 'Pause before replying when hurt'],
      },
      otherPerson: {
        traitIntensity: tensionCount > positiveCount ? 'medium' : 'low',
        attentionStyleSignals: ['May respond better when pressure is low'],
        emotionalProcessingStyle: tensionCount > positiveCount ? 'Guarded and slower to explain' : 'Warm but flexible',
        socialEnergyPattern: 'May open up more when the conversation feels calm',
        routineOrConsistencySignals: ['Consistency may vary across emotional moments'],
        possibleOverwhelmSignals: tensionCount > positiveCount ? ['Heavy topics may lead to shorter replies'] : [],
        communicationTips: ['Use one clear question at a time', 'Give room for a thoughtful answer'],
      },
    },
    personalityCardViral: {
      socialEnergy: 'You come across as emotionally aware, observant, and hard to fool when the vibe changes.',
      emotionalSignature: 'You may feel deeply, even when you are trying to act chill.',
      conversationMagnet: 'People may stay engaged because you make emotional moments feel personal and meaningful.',
      shareTrigger: 'You may want to explain or vent when something feels unclear or one-sided.',
      reactionStyle: 'When hurt or ignored, you may react quickly inside, even if you try to sound calm outside.',
      humourStyle: 'Your humour style is not fully visible here, but your messages suggest emotional sharpness and timing awareness.',
      greenFlags: ['You notice effort', 'You care about repair', 'You try to understand instead of just blaming'],
      redFlags: ['You may read tone very deeply when emotions are high', 'You may test clarity instead of asking directly', 'Letting go can feel hard when the story feels unfinished'],
      mainCharacterPattern: 'You love deeply, but you notice every shift in energy.',
      relationshipPattern: 'You tend to seek reassurance, clarity, and repair when a connection starts feeling different.',
      viralOneLiner: 'You act chill, but your intuition is always collecting receipts.',
    },
    personality: {
      user: {
        type: 'INFJ-like',
        name: 'The Pattern Reader',
        strengths: ['Attuned', 'Reflective', 'Loyal'],
        weaknesses: ['Over-interpretation', 'Emotional rumination'],
        traits: ['Looks for meaning beneath wording', 'Values honest repair', 'Needs emotional consistency'],
        profile: 'Your side of the conversation appears oriented toward meaning, reassurance, and emotional coherence. You may notice small changes quickly and try to turn ambiguity into clarity.',
      },
      otherPerson: {
        type: tensionCount > positiveCount ? 'ISTP-like' : 'ENFP-like',
        name: tensionCount > positiveCount ? 'The Guarded Responder' : 'The Warm Improviser',
        strengths: tensionCount > positiveCount ? ['Self-protective', 'Practical', 'Contained'] : ['Expressive', 'Responsive', 'Open'],
        weaknesses: tensionCount > positiveCount ? ['Indirectness', 'Emotional distance'] : ['Inconsistency', 'Delayed follow-through'],
        traits: tensionCount > positiveCount ? ['Needs space before clarity', 'May minimize emotional weight'] : ['Responds to warmth', 'Can repair with the right opening'],
        profile: `${personName} appears to communicate in a way that may be shaped by timing, pressure, and comfort with vulnerability. This MBTI-like preview is directional, not scientific certainty.`,
      },
    },
    wordCloud: {
      userTopWords: words.filter((_, index) => index % 2 === 0).slice(0, 10),
      otherTopWords: words.filter((_, index) => index % 2 === 1).slice(0, 10),
    },
    advice: {
      understand: 'Focus on the recurring emotional loop rather than any single message.',
      ask: `Ask ${personName} one calm, specific question about what they need and what they can realistically offer.`,
      avoid: 'Avoid treating uncertainty as proof. The conversation can show signals, not full intent.',
      nextBestStep: 'Choose one concrete conversation: what feels unclear, what you need, and what boundary or reassurance would help.',
    },
    personalitySnapshot: {
      communicationStyle: 'Reflective and clarity-oriented',
      emotionalPattern: pattern,
      whatHooksPeople: 'People may feel drawn to your ability to make emotionally complex situations feel personal and meaningful.',
      emotionalTriggers: 'Ambiguity, distance, mixed signals, and delayed reassurance may create stronger emotional reactions.',
      curiosityLoops: 'Your communication appears to create curiosity by leaving emotional questions open and seeking what sits beneath the surface.',
      engagementPsychology: 'Your strongest engagement pattern may come from emotional honesty, reflective questions, and a need to understand what sits beneath the surface.',
      strengths: ['Emotional awareness', 'Pattern recognition', 'Desire for repair'],
      growthAreas: ['Reducing assumption loops', 'Asking directly before concluding', 'Protecting emotional energy'],
      recurringWords: words.slice(0, 8).map((w) => w.word),
    },
    conversationRecap: {
      personName,
      relationshipType: relationshipLabel,
      platform: meta.platform || 'Unknown',
      mainDynamic: pattern,
      compatibilityScore: compatibility,
      emotionalTrend: tensionCount > positiveCount ? 'Tense but interpretable' : 'Warm but cautious',
      keyTakeaway: 'The conversation appears to invite clearer expectations, gentler timing, and a direct check-in about what each person can realistically offer.',
    },
  };
}

export function generateSampleAnalysis() {
  return generateRelationshipAnalysis({
    promptRiskLevel: 'none',
    preparedConversation: {
      metadata: { platform: 'WhatsApp', relationshipType: 'Early stage dating / seeing each other', personName: 'Avery' },
      messageCount: 148,
      estimatedDateRange: 'Apr 12 to May 26',
      participantNames: ['You', 'Avery'],
      importantMoments: [
        { period: 'Apr 12', speaker: 'You', text: "I'm not sure about this, but I care and I want to understand.", emotionalWeight: 3 },
        { period: 'Apr 18', speaker: 'Avery', text: "It's been on my mind a lot. I don't want us to fight.", emotionalWeight: 4 },
        { period: 'May 04', speaker: 'You', text: 'I just feel so drained and a little ignored lately.', emotionalWeight: 4 },
        { period: 'May 18', speaker: 'Avery', text: "It's getting harder lately, but I promise I'm trying.", emotionalWeight: 4 },
      ],
      topWords: [
        { word: 'care', count: 9 }, { word: 'sorry', count: 8 }, { word: 'talk', count: 7 }, { word: 'busy', count: 6 },
        { word: 'feel', count: 6 }, { word: 'distant', count: 5 }, { word: 'trust', count: 5 }, { word: 'honest', count: 4 },
        { word: 'miss', count: 4 }, { word: 'worried', count: 3 }, { word: 'explain', count: 3 }, { word: 'stay', count: 2 },
      ],
    },
  });
}
