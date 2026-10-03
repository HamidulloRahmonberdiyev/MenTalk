// Smoke test for the Gemini setup: node --env-file=.env.local scripts/gemini-check.mjs
const key = process.env.EXPO_PUBLIC_GEMINI_API_KEY;
const base = process.env.EXPO_PUBLIC_GEMINI_BASE_URL ?? 'https://generativelanguage.googleapis.com/v1beta';
const model = process.env.EXPO_PUBLIC_GEMINI_MODEL ?? 'gemini-3.5-flash-lite';
const translateModel = process.env.EXPO_PUBLIC_GEMINI_TRANSLATE_MODEL ?? 'gemini-3.5-flash-lite';
const ttsModel = process.env.EXPO_PUBLIC_GEMINI_TTS_MODEL ?? 'gemini-3.8-flash-tts';
const voice = process.env.EXPO_PUBLIC_GEMINI_VOICE ?? 'Kore';

if (!key) {
  console.error('EXPO_PUBLIC_GEMINI_API_KEY is empty. Put it in .env.local first.');
  process.exit(1);
}

async function call(name, modelId, body) {
  const started = Date.now();
  const response = await fetch(`${base}/models/${modelId}:generateContent`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json', 'x-goog-api-key': key },
    body: JSON.stringify(body),
  });
  const data = await response.json().catch(() => ({}));
  const ms = Date.now() - started;
  if (!response.ok) {
    console.log(`✗ ${name} (${modelId}) HTTP ${response.status}: ${data.error?.message ?? 'unknown error'}`);
    return null;
  }
  console.log(`✓ ${name} (${modelId}) ${ms} ms`);
  return data;
}

const turn = await call('conversation turn', model, {
  systemInstruction: { parts: [{ text: 'You are Anna, a Russian tutor in a cafe. Reply in Russian, one short sentence.' }] },
  contents: [{ role: 'user', parts: [{ text: 'Begin: greet the learner and ask what they want to order.' }] }],
  generationConfig: {
    responseMimeType: 'application/json',
    responseSchema: {
      type: 'OBJECT',
      properties: { reply: { type: 'STRING' }, emotion: { type: 'STRING', enum: ['neutral', 'happy'] } },
      required: ['reply', 'emotion'],
    },
  },
});
if (turn) console.log('  →', turn.candidates?.[0]?.content?.parts?.[0]?.text);

const speech = await call('text to speech', ttsModel, {
  contents: [{ parts: [{ text: 'Say in a warm, natural, friendly tone: Здравствуйте! Что вы будете заказывать?' }] }],
  generationConfig: {
    responseModalities: ['AUDIO'],
    speechConfig: { voiceConfig: { prebuiltVoiceConfig: { voiceName: voice } } },
  },
});
const inline = speech?.candidates?.[0]?.content?.parts?.find((part) => part.inlineData)?.inlineData;
if (speech) console.log('  →', inline ? `audio ${inline.mimeType}, ${Math.round(inline.data.length * 0.75)} bytes` : 'no audio in response');

const translated = await call('translation', translateModel, {
  systemInstruction: { parts: [{ text: 'Translate into Uzbek (Latin). Return JSON.' }] },
  contents: [{ role: 'user', parts: [{ text: 'Good morning, how are you?' }] }],
  generationConfig: {
    responseMimeType: 'application/json',
    responseSchema: { type: 'OBJECT', properties: { translation: { type: 'STRING' } }, required: ['translation'] },
  },
});
if (translated) console.log('  →', translated.candidates?.[0]?.content?.parts?.[0]?.text);
