import type { Language } from '@/i18n';

/**
 * Every reminder the device can send, written per interface language. Placeholders:
 * {name} learner's first name (or a friendly stand-in), {tutor} the tutor's name,
 * {n} a number (streak days, due words), {topic} a conversation topic.
 *
 * Tone: warm, short, a little playful; never guilt-tripping. The title carries the hook,
 * the body says what to do and how little time it takes.
 */
export type ReminderCategory =
  | 'firstSteps'
  | 'streakRisk'
  | 'streakKeep'
  | 'wordsDue'
  | 'talk'
  | 'topic'
  | 'game'
  | 'pronunciation'
  | 'translate'
  | 'tip'
  | 'comeback';

export interface ReminderText {
  title: string;
  body: string;
}

type Catalogue = Record<ReminderCategory, readonly ReminderText[]>;

const uz: Catalogue = {
  firstSteps: [
    { title: '{tutor} sizni kutyapti 👋', body: 'Birinchi suhbat atigi 2 daqiqa. Salom deb boshlang — qolganini birga qilamiz.' },
    { title: 'Birinchi qadam eng qiyini emas 😉', body: '{name}, bitta qisqa suhbat va siz allaqachon gapira boshlaysiz.' },
    { title: 'Bugun gapirib ko‘ramizmi? 🎙️', body: 'Xato qilishdan qo‘rqmang: {tutor} sabrli va hech kimga aytmaydi 🤫' },
  ],
  streakRisk: [
    { title: '🔥 {n} kunlik seriya xavf ostida!', body: 'Yarim tungacha bitta qisqa mashq — va olov o‘chmaydi.' },
    { title: 'Olovni o‘chirmang, {name}! 🔥', body: '{n} kun ketma-ket — bunga achinarli. 3 daqiqa yetarli.' },
    { title: '{n} kun… va bugun? 👀', body: 'Seriyangiz sizni kutyapti. Bitta so‘z o‘yini ham hisob.' },
  ],
  streakKeep: [
    { title: '🔥 {n} kun — zo‘r ketyapsiz!', body: 'Bugun ham bir qadam qo‘shamizmi? Seriya o‘sishda davom etsin.' },
    { title: 'Seriya: {n} kun 💪', body: '{name}, odat shakllanyapti. Bugungi mashq bilan uni mustahkamlang.' },
  ],
  wordsDue: [
    { title: 'So‘zlar sog‘inib qolishdi 📚', body: '{n} ta so‘z takrorlashni kutyapti. 3 daqiqa — va ular xotirada qoladi.' },
    { title: 'Xotirangizni yangilash vaqti 🧠', body: 'Aynan hozir {n} ta so‘zni takrorlash eng samarali — unutilishidan oldin.' },
    { title: '{n} ta so‘z sizni chaqiryapti 🔔', body: 'Tezkor o‘yin: to‘g‘ri javoblar, kombo va XP. Boshladikmi?' },
  ],
  talk: [
    { title: '{tutor} bilan 5 daqiqa? ☕', body: 'Bugungi kayfiyatingiz haqida gaplashing — tarjimasiz, bemalol.' },
    { title: 'Gapirish — eng tez yo‘l 🚀', body: '{name}, bugun bitta jonli suhbat bir hafta o‘qishdan foydaliroq.' },
    { title: '{tutor} yangi savol tayyorladi 💬', body: 'Kirib javob bering — u sizni tinglashga tayyor.' },
    { title: 'Ovozingizni sog‘indik 🎧', body: 'Qisqa suhbat qiling: talaffuz, so‘zlar va ishonch — barchasi birdaniga.' },
  ],
  topic: [
    { title: 'Bugungi mavzu: {topic} ✨', body: 'Real hayotdagi vaziyatni mashq qiling — keyin haqiqiy hayotda oson bo‘ladi.' },
    { title: '{topic} — tayyormisiz? 🎬', body: '{tutor} rol o‘ynashga tayyor. Siz bosh qahramonsiz.' },
  ],
  game: [
    { title: 'Tezkor o‘yin vaqti 🎮', body: '10 ta savol, kombo va XP. Rekordingizni yangilay olasizmi?' },
    { title: 'Miyangizni qizdirib oling 🧩', body: 'Bitta so‘z o‘yini — kofe tayyor bo‘lguncha tugaydi ☕' },
  ],
  pronunciation: [
    { title: 'Talaffuzingizni tekshiramizmi? 🎙️', body: 'Ibora ayting — qaysi tovush qiyinligini darhol ko‘rsatamiz.' },
    { title: 'Bugun aksentsiz kun 😎', body: '1 daqiqalik talaffuz mashqi. Natijangiz sizni xursand qiladi.' },
  ],
  translate: [
    { title: 'Bugun qanday so‘z kerak bo‘ldi? 🤔', body: 'Tarjimonga yozing — ma’no, misol va lug‘atga bir bosishda.' },
    { title: 'Yangi so‘z = yangi imkoniyat 🌱', body: 'Bugun eshitgan notanish so‘zni tarjima qiling va saqlang.' },
  ],
  tip: [
    { title: 'Kichik sir 🤫', body: 'Kuniga 10 daqiqa haftada bir marta 2 soatdan samaraliroq. Bugungi 10 daqiqangiz?' },
    { title: 'Bilasizmi? 💡', body: 'So‘zni ovoz chiqarib aytsangiz, u 2 barobar yaxshiroq eslab qolinadi.' },
    { title: 'Xato — bu o‘sish 📈', body: 'Har bir xato miyaga yangi yo‘l ochadi. Bugun bemalol xato qiling!' },
  ],
  comeback: [
    { title: 'Biz sizni sog‘indik 💙', body: '{name}, {tutor} hali ham sizni kutyapti. Bitta qisqa suhbat bilan qayting.' },
    { title: 'Qaytish hech qachon kech emas 🌅', body: 'Qayerda to‘xtagan bo‘lsangiz, o‘sha yerdan davom etamiz.' },
    { title: 'Bilimlaringiz hali shu yerda 🧠', body: 'Bir oz takrorlasangiz, hammasi tez esga tushadi. 3 daqiqa?' },
    { title: 'Oxirgi eslatma 🙂', body: 'Endi bezovta qilmaymiz. Tayyor bo‘lsangiz — {tutor} doim shu yerda.' },
  ],
};

const ru: Catalogue = {
  firstSteps: [
    { title: '{tutor} ждёт вас 👋', body: 'Первый разговор — всего 2 минуты. Начните с «привет», остальное сделаем вместе.' },
    { title: 'Первый шаг — самый приятный 😉', body: '{name}, один короткий разговор — и вы уже говорите.' },
    { title: 'Поговорим сегодня? 🎙️', body: 'Не бойтесь ошибок: {tutor} терпелива и никому не расскажет 🤫' },
  ],
  streakRisk: [
    { title: '🔥 Серия в {n} дн. под угрозой!', body: 'Одно короткое занятие до полуночи — и огонь не погаснет.' },
    { title: 'Не дайте огню погаснуть, {name}! 🔥', body: '{n} дн. подряд — жалко терять. Хватит 3 минут.' },
    { title: '{n} дн. подряд… а сегодня? 👀', body: 'Серия ждёт вас. Даже одна игра со словами засчитывается.' },
  ],
  streakKeep: [
    { title: '🔥 {n} дн. — вы молодец!', body: 'Сделаем ещё шаг сегодня? Пусть серия растёт.' },
    { title: 'Серия: {n} дн. 💪', body: '{name}, привычка уже формируется. Закрепите её сегодняшним занятием.' },
  ],
  wordsDue: [
    { title: 'Слова соскучились 📚', body: 'Ждут повторения: {n}. 3 минуты — и они останутся в памяти.' },
    { title: 'Время освежить память 🧠', body: 'Именно сейчас повторять эффективнее всего — до того, как слова забудутся ({n}).' },
    { title: 'Вас зовут слова: {n} 🔔', body: 'Быстрая игра: верные ответы, комбо и XP. Начнём?' },
  ],
  talk: [
    { title: '5 минут с {tutor}? ☕', body: 'Расскажите, как прошёл день — без перевода и без спешки.' },
    { title: 'Говорить — самый быстрый путь 🚀', body: '{name}, один живой разговор полезнее недели зубрёжки.' },
    { title: '{tutor} приготовила новый вопрос 💬', body: 'Загляните и ответьте — вас готовы выслушать.' },
    { title: 'Соскучились по вашему голосу 🎧', body: 'Короткий разговор: произношение, слова и уверенность — всё сразу.' },
  ],
  topic: [
    { title: 'Тема дня: {topic} ✨', body: 'Отрепетируйте ситуацию здесь — в жизни будет легко.' },
    { title: '{topic} — готовы? 🎬', body: '{tutor} готова к ролевой игре. Главная роль — ваша.' },
  ],
  game: [
    { title: 'Время быстрой игры 🎮', body: '10 вопросов, комбо и XP. Побьёте свой рекорд?' },
    { title: 'Разомните мозг 🧩', body: 'Одна игра со словами — успеете, пока закипает чайник ☕' },
  ],
  pronunciation: [
    { title: 'Проверим произношение? 🎙️', body: 'Скажите фразу — сразу покажем, какой звук даётся труднее.' },
    { title: 'Сегодня — день без акцента 😎', body: 'Минута тренировки произношения. Результат вас порадует.' },
  ],
  translate: [
    { title: 'Какое слово понадобилось сегодня? 🤔', body: 'Напишите в переводчик — значение, пример и в словарь одним нажатием.' },
    { title: 'Новое слово — новые возможности 🌱', body: 'Переведите незнакомое слово, которое услышали сегодня, и сохраните его.' },
  ],
  tip: [
    { title: 'Маленький секрет 🤫', body: '10 минут каждый день лучше, чем 2 часа раз в неделю. Ваши 10 минут сегодня?' },
    { title: 'А вы знали? 💡', body: 'Слово, сказанное вслух, запоминается вдвое лучше.' },
    { title: 'Ошибка — это рост 📈', body: 'Каждая ошибка прокладывает новый путь в мозге. Ошибайтесь смело!' },
  ],
  comeback: [
    { title: 'Мы скучаем 💙', body: '{name}, {tutor} всё ещё ждёт вас. Вернитесь с одним коротким разговором.' },
    { title: 'Вернуться никогда не поздно 🌅', body: 'Продолжим ровно с того места, где вы остановились.' },
    { title: 'Ваши знания никуда не делись 🧠', body: 'Немного повторения — и всё быстро вспомнится. 3 минуты?' },
    { title: 'Последнее напоминание 🙂', body: 'Больше не будем беспокоить. Когда будете готовы — {tutor} всегда здесь.' },
  ],
};

const en: Catalogue = {
  firstSteps: [
    { title: '{tutor} is waiting for you 👋', body: 'Your first talk takes just 2 minutes. Say hi — we will do the rest together.' },
    { title: 'The first step is the fun one 😉', body: '{name}, one short talk and you are already speaking.' },
    { title: 'Shall we talk today? 🎙️', body: 'No fear of mistakes: {tutor} is patient and won’t tell anyone 🤫' },
  ],
  streakRisk: [
    { title: '🔥 Your {n}-day streak is at risk!', body: 'One short session before midnight keeps the fire burning.' },
    { title: 'Keep the fire alive, {name}! 🔥', body: '{n} days in a row — too good to lose. 3 minutes is enough.' },
    { title: '{n} days… and today? 👀', body: 'Your streak is waiting. Even one word game counts.' },
  ],
  streakKeep: [
    { title: '🔥 {n} days — you’re on a roll!', body: 'One more step today? Let the streak keep growing.' },
    { title: 'Streak: {n} days 💪', body: '{name}, the habit is forming. Lock it in with today’s session.' },
  ],
  wordsDue: [
    { title: 'Your words miss you 📚', body: '{n} words are ready for review. 3 minutes and they stay with you.' },
    { title: 'Memory refresh time 🧠', body: 'Right now is the best moment to review {n} words — before they fade.' },
    { title: '{n} words are calling 🔔', body: 'Quick game: right answers, combos and XP. Ready?' },
  ],
  talk: [
    { title: '5 minutes with {tutor}? ☕', body: 'Talk about your day — no translation, no rush.' },
    { title: 'Speaking is the fastest way 🚀', body: '{name}, one real conversation beats a week of cramming.' },
    { title: '{tutor} has a new question 💬', body: 'Pop in and answer — someone is ready to listen.' },
    { title: 'We miss your voice 🎧', body: 'A short talk: pronunciation, words and confidence all at once.' },
  ],
  topic: [
    { title: 'Today’s topic: {topic} ✨', body: 'Rehearse it here and real life gets easy.' },
    { title: '{topic} — ready? 🎬', body: '{tutor} is ready to role-play. You play the lead.' },
  ],
  game: [
    { title: 'Quick game time 🎮', body: '10 questions, combos and XP. Can you beat your record?' },
    { title: 'Warm up your brain 🧩', body: 'One word game — done before the kettle boils ☕' },
  ],
  pronunciation: [
    { title: 'Check your pronunciation? 🎙️', body: 'Say a phrase and see right away which sound is tricky.' },
    { title: 'Accent-free day 😎', body: 'A one-minute pronunciation drill. You’ll like the result.' },
  ],
  translate: [
    { title: 'What word did you need today? 🤔', body: 'Ask the translator — meaning, example and saved in one tap.' },
    { title: 'New word, new doors 🌱', body: 'Translate a word you heard today and keep it.' },
  ],
  tip: [
    { title: 'A little secret 🤫', body: '10 minutes a day beats 2 hours once a week. Your 10 minutes today?' },
    { title: 'Did you know? 💡', body: 'Words you say out loud stick twice as well.' },
    { title: 'Mistakes mean growth 📈', body: 'Every mistake builds a new path in your brain. Make some today!' },
  ],
  comeback: [
    { title: 'We miss you 💙', body: '{name}, {tutor} is still waiting. Come back with one short talk.' },
    { title: 'It’s never too late 🌅', body: 'We’ll pick up right where you left off.' },
    { title: 'What you learned is still there 🧠', body: 'A little review and it all comes back fast. 3 minutes?' },
    { title: 'Last reminder 🙂', body: 'We won’t bother you again. Whenever you’re ready, {tutor} is here.' },
  ],
};

export const REMINDER_COPY: Record<Language, Catalogue> = { uz, ru, en };

/** Stand-in for {name} when the learner has not given one. */
export const FRIEND: Record<Language, string> = { uz: 'do‘stim', ru: 'друг', en: 'friend' };
