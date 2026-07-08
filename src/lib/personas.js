export const DEFAULT_PERSONA_ID = 'warm';

export const COACH_PERSONAS = [
  {
    id: 'warm',
    name: 'The Warm One',
    emoji: '💛',
    description: 'Your caring, emotionally supportive confidant',
  },
  {
    id: 'real',
    name: 'The Real One',
    emoji: '🌈',
    description: 'Your brutally honest, fabulous best friend who hypes you up but never lets you lie to yourself',
  },
  {
    id: 'strategist',
    name: 'The Strategist',
    emoji: '🎯',
    description: 'Structured, practical, action-oriented relationship coaching',
  },
  {
    id: 'savage',
    name: 'The Savage',
    emoji: '🔥',
    description: 'Witty, sarcastic roasting with tough love underneath',
  },
];

export function getPersonaById(personaId) {
  return COACH_PERSONAS.find((persona) => persona.id === personaId) || COACH_PERSONAS.find((persona) => persona.id === DEFAULT_PERSONA_ID);
}
