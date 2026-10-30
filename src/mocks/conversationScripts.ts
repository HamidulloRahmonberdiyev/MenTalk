import type { StudyLanguage } from '@/services/learning';
import type { ScenarioId } from '@/types';

export interface ConversationScript {
  /** Tutor lines, played one per user turn. */
  aiLines: readonly string[];
  /** Suggested user phrases, aligned with the tutor lines. */
  hints: readonly string[];
}

const RUSSIAN_SCRIPTS: Readonly<Record<ScenarioId, ConversationScript>> = {
  intro: {
    aiLines: [
      'Привет! Меня зовут Анна. А как вас зовут?',
      'Очень приятно! Откуда вы родом?',
      'Как интересно! А чем вы занимаетесь?',
      'Здорово! Почему вы решили изучать русский язык?',
    ],
    hints: [
      'Меня зовут… Очень приятно.',
      'Я из Узбекистана.',
      'Я работаю программистом.',
      'Я хочу говорить свободно.',
    ],
  },
  cafe: {
    aiLines: [
      'Здравствуйте! Что вы будете заказывать?',
      'Отличный выбор! Что-нибудь ещё? Может быть, десерт?',
      'Хорошо. Вы будете платить картой или наличными?',
      'Спасибо! Ваш заказ будет готов через пять минут. Хорошего дня!',
    ],
    hints: [
      'Я хотел бы капучино, пожалуйста.',
      'Да, кусочек чизкейка, пожалуйста.',
      'Картой, пожалуйста.',
      'Спасибо, до свидания!',
    ],
  },
  shop: {
    aiLines: [
      'Добрый день! Вам чем-нибудь помочь?',
      'Конечно, вот они. Этот размер вам подойдёт?',
      'Сто двадцать рублей. Пакет нужен?',
      'Пожалуйста! Заходите ещё.',
    ],
    hints: [
      'Да, я ищу молоко.',
      'Да, спасибо. Сколько это стоит?',
      'Нет, пакет не нужен.',
      'Спасибо, всего доброго!',
    ],
  },
  taxi: {
    aiLines: [
      'Добрый вечер! Куда едем?',
      'Хорошо. Вам удобнее по навигатору или другой дорогой?',
      'Мы почти приехали. Вас высадить у входа?',
      'С вас четыреста рублей. Оплата картой?',
    ],
    hints: [
      'Мне нужно в аэропорт.',
      'Как вам удобнее, пожалуйста.',
      'Да, у входа, пожалуйста.',
      'Да, картой. Спасибо!',
    ],
  },
  work: {
    aiLines: [
      'Доброе утро! Как ваши дела?',
      'Отлично. Вы уже видели план на сегодня?',
      'Хорошо. Когда вы сможете закончить отчёт?',
      'Договорились. Спасибо за работу!',
    ],
    hints: [
      'Доброе утро! Всё хорошо.',
      'Да, я посмотрел план.',
      'Я закончу к пяти часам.',
      'Пожалуйста, хорошего дня!',
    ],
  },
  airport: {
    aiLines: [
      'Здравствуйте! Ваш паспорт и билет, пожалуйста.',
      'Спасибо. У вас есть багаж для сдачи?',
      'Ваше место двенадцать «А», у окна. Посадка в 14:30.',
      'Счастливого полёта!',
    ],
    hints: [
      'Вот мой паспорт и билет.',
      'Да, один чемодан.',
      'Спасибо. А какой выход?',
      'Спасибо, до свидания!',
    ],
  },
};

const ENGLISH_SCRIPTS: Readonly<Record<ScenarioId, ConversationScript>> = {
  intro: {
    aiLines: [
      "Hi! I'm Emma. What's your name?",
      'Nice to meet you! Where are you from?',
      'How interesting! And what do you do?',
      'Great! Why did you decide to learn English?',
    ],
    hints: ['My name is… Nice to meet you.', "I'm from Uzbekistan.", 'I work as a programmer.', 'I want to speak fluently.'],
  },
  cafe: {
    aiLines: [
      'Hello! What can I get you today?',
      'Great choice! Anything else? Maybe a dessert?',
      'Lovely. Will you pay by card or cash?',
      'Thank you! Your order will be ready in five minutes.',
    ],
    hints: ["I'd like a cappuccino, please.", 'Yes, a piece of cheesecake, please.', 'By card, please.', 'Thank you, goodbye!'],
  },
  shop: {
    aiLines: [
      'Good afternoon! Can I help you with anything?',
      'Of course, here they are. Is this size all right?',
      "That's twelve pounds. Do you need a bag?",
      'You are welcome! Come again.',
    ],
    hints: ["Yes, I'm looking for milk.", 'Yes, thanks. How much is it?', "No, I don't need a bag.", 'Thanks, have a nice day!'],
  },
  taxi: {
    aiLines: [
      'Good evening! Where are we going?',
      'All right. Shall I follow the sat nav or take another way?',
      "We're almost there. Shall I drop you at the entrance?",
      "That's twenty-five pounds. Card?",
    ],
    hints: ['I need to get to the airport.', 'Whatever is quicker, please.', 'Yes, at the entrance, please.', 'Yes, by card. Thank you!'],
  },
  work: {
    aiLines: [
      'Good morning! How are you?',
      "Great. Have you seen today's plan yet?",
      'Good. When can you finish the report?',
      'Deal. Thanks for your help!',
    ],
    hints: ["Good morning! I'm fine.", "Yes, I've seen the plan.", "I'll finish it by five o'clock.", 'No problem, have a nice day!'],
  },
  airport: {
    aiLines: [
      'Hello! Your passport and ticket, please.',
      'Thank you. Do you have any luggage to check in?',
      'Your seat is twelve A, by the window. Boarding is at 2:30.',
      'Have a nice flight!',
    ],
    hints: ['Here is my passport and ticket.', 'Yes, one suitcase.', 'Thank you. Which gate is it?', 'Thank you, goodbye!'],
  },
};

export const CONVERSATION_SCRIPTS: Readonly<Record<StudyLanguage, Readonly<Record<ScenarioId, ConversationScript>>>> = {
  ru: RUSSIAN_SCRIPTS,
  en: ENGLISH_SCRIPTS,
};
