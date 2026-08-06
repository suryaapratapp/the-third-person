-- Stop retaining uploaded conversations after analysis.
--
-- relationship_reports.prepared_conversation was storing the transcript itself:
-- cleanedText (verbatim conversation), parsedMessages (message-by-message),
-- compressedConversation, firstMessages/lastMessages/importantMoments, and
-- analysisPipeline.chunks (representativeMessages).
--
-- Nothing read any of it. Every consumer — ResultPage and
-- buildAnalysisChainContext — only ever used the derived aggregates, so this is
-- pure liability with no feature attached: 493 kB -> 17 kB across 14 reports.
--
-- Neither the AI Coach nor Know Yourself is affected. Both already ran entirely
-- on derived summaries; Know Yourself's prompt explicitly forbids raw chats.
--
-- Evidence quotes inside analysis_json (redFlags[].evidenceQuote,
-- timeline[].quote, personProfile[].quote, bestieContextSummary.usefulQuotes)
-- are deliberately NOT removed: they are the receipts each finding rests on and
-- are shown to the user. Deleting a report still deletes them with it.
--
-- Going forward the edge function never writes these keys at all — see
-- RETAINED_CONVERSATION_KEYS in generate-relationship-report/index.ts, mirrored
-- client-side in src/lib/retainedConversation.js. This migration only cleans up
-- rows written before that change.
--
-- Irreversible by design.

update public.relationship_reports
set prepared_conversation =
      (prepared_conversation
        - 'cleanedText'
        - 'parsedMessages'
        - 'compressedConversation'
        - 'firstMessages'
        - 'lastMessages'
        - 'importantMoments'
        - 'analysisPipeline'
        - 'replyGaps'
        - 'dailyNightBreakdown'
        - 'affectionSignals'
        - 'conflictSignals')
      || jsonb_build_object('rawConversationDiscarded', true),
    updated_at = now()
where prepared_conversation ?| array[
  'cleanedText','parsedMessages','compressedConversation','firstMessages',
  'lastMessages','importantMoments','analysisPipeline','replyGaps',
  'dailyNightBreakdown','affectionSignals','conflictSignals'
];
