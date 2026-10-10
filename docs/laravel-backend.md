# MenTalk API — Laravel backend (to'liq texnik hujjat)

Maqsad: Expo ilovasi hozir Gemini'ni to'g'ridan-to'g'ri chaqiradi va kalit ilova ichida ochiq turadi. Backend buni xavfsiz, tez va **dinamik** (kontent va promptlar admin paneldan boshqariladigan) qiladi. Bir vaqtda 100 foydalanuvchi bilan qotmasdan, sekinlashmasdan ishlashi kerak.

---

## 1. Qisqacha qarorlar

| Mavzu            | Qaror                                              | Sabab                                                |
| ---------------- | -------------------------------------------------- | ---------------------------------------------------- |
| Framework        | Laravel 13, PHP 8.4                                | Joriy LTS yo'nalishi, readonly class, property hooks |
| Server           | **Octane (Swoole)**                                | Framework bir marta yuklanadi, so'rov 5–15 ms        |
| DB               | PostgreSQL 16 + PgBouncer                          | Ulanishlar soni nazoratda, `jsonb`, partial index    |
| Kesh/Navbat/Qulf | Redis 7 (phpredis + igbinary)                      | Bitta tez qatlam                                     |
| Navbat           | Horizon                                            | Monitoring, retry, balans                            |
| Auth             | Sanctum (mobil token) + Google ID token tekshiruvi | Oddiy va yetarli                                     |
| Admin            | Filament 4                                         | Kontent va promptlar kodsiz o'zgaradi                |
| Fayl             | S3-mos storage (Cloudflare R2) + CDN               | TTS audio keshi                                      |
| Sifat            | Pest, Larastan (level 8), Pint, `strict_types`     | Toza kod kafolati                                    |

**Eng muhim arxitektura qarori: ikkita alohida worker pool (bulkhead).**
PHP worker bir vaqtda bitta so'rovni bajaradi. Gemini javobi 2–8 soniya oladi. Agar hammasi bitta poolda bo'lsa, sekin AI so'rovlar login va sinxronizatsiyani ham to'xtatib qo'yadi. Shuning uchun:

- `api-fast` (8 worker): login, bootstrap, profil, so'zlar sinxronizatsiyasi, tarix. Har biri < 50 ms.
- `api-ai` (48 worker): suhbat, tarjima, so'z qidirish. Gemini kutadi.

Bitta kod bazasi, ikkita jarayon guruhi. Nginx yo'lga qarab yo'naltiradi (10-bo'lim).

---

## 2. Quvvat hisobi (100 bir vaqtdagi foydalanuvchi)

- Foydalanuvchi suhbatda gapiradi (~5 s), AI javob beradi, u o'qiydi/o'ylaydi (~5 s). AI so'rovi aylanishning ~1/3 qismini egallaydi.
- 100 faol foydalanuvchi ≈ **~35 bir vaqtdagi AI so'rov**. Pool 48 worker: zaxira bor.
- Xotira: (48 + 8) worker × ~70 MB ≈ **4 GB**. Bitta 4 vCPU / 8 GB tugun yetadi; ishonchlilik uchun 2 ta tugun + load balancer.
- Haqiqiy to'siq Gemini kvotasi (RPM), PHP emas. Yechim: kalitlar puli, foydalanuvchi limiti, kunlik kvota, keshlash (7-bo'lim).
- Maqsadli SLO: oddiy endpoint p95 < 300 ms, AI endpoint p95 < 8 s, xato < 1%.

Tezlik beradigan asosiy qarorlar:

1. **Keshlar:** TTS audio (matn bo'yicha), so'z qidirish, tarjima, bootstrap (ETag), promptlar.
2. **Gemini ulanishi qayta ishlatiladi:** bitta `GuzzleHttp\Client` singleton, TLS qo'l siqish har so'rovda takrorlanmaydi.
3. **DB tranzaksiyasi ichida hech qachon tarmoq so'rovi yo'q.** Ulanish PgBouncer'da band bo'lib qolmasin.
4. **Yozuvlar kichik va bittalik:** tur (turn) juftligi bitta `insert`, statistika `on conflict do update`.
5. **Og'ir ishlar javobdan keyin:** AI sarfi yozuvi `afterResponse()`.

---

## 3. Loyiha tuzilmasi

```
app/
├── Actions/               bitta vazifa = bitta invokable class
│   ├── Auth/              LoginWithGoogle, DeleteAccount
│   ├── Conversation/      StartConversation, SendTurn, RequestHint, FinishConversation
│   ├── Vocabulary/        SyncCards, ReviewCards, LookupWord
│   └── Translator/        Translate
├── Contracts/             AiClient, SpeechSynthesizer, IdentityVerifier
├── DTO/                   AiRequest, TurnInput, TurnResult, SpeechClip, CardChange
├── Enums/                 Level, Gender, TurnRole, TurnKind, ConversationState
├── Exceptions/            AiUnavailable, AiRateLimited, AiOverloaded, AiRejected
├── Http/
│   ├── Controllers/       yupqa, faqat Action chaqiradi
│   ├── Middleware/        DailyQuota, ETag
│   ├── Requests/          validatsiya + DTO'ga o'girish
│   └── Resources/         JSON shakli
├── Jobs/
├── Models/
├── Observers/             kesh bekor qilish
├── Policies/
├── Providers/
├── Services/
│   ├── Ai/                GeminiTransport, GeminiClient, MeteredAiClient, KeyPool, PromptBuilder, PromptStore, Schemas
│   └── Speech/            GeminiSynthesizer, CachedSynthesizer, Wav
└── Support/               Srs, Xp, Streaks, Text, Problem
```

### SOLID qanday qo'llanadi

| Tamoyil | Loyihadagi ko'rinishi                                                                                      |
| ------- | ---------------------------------------------------------------------------------------------------------- |
| **S**   | Controller faqat HTTP; Action bitta use-case; `KeyPool` faqat kalit tanlaydi; `GeminiTransport` faqat HTTP |
| **O**   | Yangi AI provayder = yangi `AiClient` class. Yangi stsenariy = DB'ga qator. Mavjud kod o'zgarmaydi         |
| **L**   | `CachedSynthesizer` va `MeteredAiClient` o'z interfeysini to'liq almashtiradi (dekoratorlar)               |
| **I**   | `AiClient` (matn/JSON) va `SpeechSynthesizer` (ovoz) alohida, kichik interfeyslar                          |
| **D**   | Action'lar konkret `GeminiClient`'ni emas, `AiClient` interfeysini biladi; ulash `AppServiceProvider`da    |

### Kod qoidalari

- Har faylda `declare(strict_types=1);`, `final` class, imkon bo'lsa `readonly`.
- Controller'da biznes mantiq yo'q. Validatsiya `FormRequest`da, javob `Resource`da.
- Izoh faqat **nima uchun** degan savolga javob bo'lsa yoziladi. Nomning o'zi tushuntirishi kerak.
- Pint (`laravel` preset), Larastan level 8, `Model::shouldBeStrict()` (lazy loading va jimgina to'ldirishlar xato beradi).

---

## 4. O'rnatish

```bash
composer create-project laravel/laravel mentalk-api && cd mentalk-api
php artisan install:api
composer require laravel/octane laravel/horizon google/apiclient filament/filament sentry/sentry-laravel
composer require --dev pestphp/pest pestphp/pest-plugin-laravel larastan/larastan laravel/pint
php artisan octane:install --server=swoole
php artisan horizon:install
php artisan filament:install --panels
```

`.env` (production, muhim qismi):

```dotenv
APP_ENV=production
APP_DEBUG=false
LOG_CHANNEL=stderr

DB_CONNECTION=pgsql
DB_HOST=pgbouncer
DB_PORT=6432

CACHE_STORE=redis
QUEUE_CONNECTION=redis
SESSION_DRIVER=array
REDIS_CLIENT=phpredis
REDIS_SERIALIZER=igbinary

GEMINI_KEYS=key1,key2,key3
GEMINI_MODEL=gemini-3.5-flash-lite
GEMINI_FALLBACK_MODEL=gemini-3.8-flash
GEMINI_TTS_MODEL=gemini-3.8-flash-tts
GEMINI_VOICE=Sulafat

GOOGLE_CLIENT_IDS=ios-id,android-id,web-id
SPEECH_DISK_URL=https://cdn.mentalk.app/speech
```

`config/database.php` (PgBouncer transaction rejimi uchun):

```php
'pgsql' => [
    // ...
    'options' => [PDO::ATTR_EMULATE_PREPARES => true],
],
```

`config/ai.php`:

```php
<?php

declare(strict_types=1);

return [
    'keys' => array_values(array_filter(explode(',', (string) env('GEMINI_KEYS')))),
    'base_url' => env('GEMINI_BASE_URL', 'https://generativelanguage.googleapis.com/v1beta'),
    'model' => env('GEMINI_MODEL', 'gemini-3.5-flash-lite'),
    'fallback_model' => env('GEMINI_FALLBACK_MODEL', 'gemini-3.8-flash'),
    'tts_model' => env('GEMINI_TTS_MODEL', 'gemini-3.8-flash-tts'),
    'voice' => env('GEMINI_VOICE', 'Sulafat'),
    'timeout' => 25,
    'key_cooldown' => 30,
];
```

`config/quota.php`:

```php
<?php

declare(strict_types=1);

return ['turns' => 300, 'lookups' => 400];
```

---

## 5. Ma'lumotlar bazasi

Identifikatorlar ULID (tartiblangan, indeksga qulay, ketma-ket raqamni oshkor qilmaydi).

```php
Schema::create('users', function (Blueprint $t) {
    $t->ulid('id')->primary();
    $t->string('google_id')->unique();
    $t->string('email')->unique();
    $t->string('name');
    $t->timestamps();
    $t->softDeletes();
});

Schema::create('learner_profiles', function (Blueprint $t) {
    $t->ulid('user_id')->primary();
    $t->foreign('user_id')->references('id')->on('users')->cascadeOnDelete();
    $t->string('gender', 12)->nullable();
    $t->char('country', 2)->nullable();
    $t->date('birth_date')->nullable();
    $t->string('level', 16)->nullable();
    $t->jsonb('goals')->default('[]');
    $t->char('ui_language', 2)->default('uz');
    $t->string('timezone', 40)->default('Asia/Tashkent');
    $t->unsignedSmallInteger('daily_goal_minutes')->default(10);
    $t->unsignedInteger('xp')->default(0);
    $t->unsignedSmallInteger('streak')->default(0);
    $t->date('last_active_on')->nullable();
});

Schema::create('scenarios', function (Blueprint $t) {
    $t->string('id', 24)->primary();
    $t->string('icon', 40);
    $t->string('tint', 9);
    $t->jsonb('gradient');
    $t->string('image_path')->nullable();
    $t->jsonb('title');
    $t->jsonb('subtitle');
    $t->text('brief');
    $t->text('next_topics');
    $t->unsignedSmallInteger('sort')->default(0);
    $t->boolean('active')->default(true);
    $t->timestamps();
});

Schema::create('ai_prompts', function (Blueprint $t) {
    $t->id();
    $t->string('key', 64)->unique();
    $t->text('body');
    $t->boolean('active')->default(true);
    $t->timestamps();
});

Schema::create('conversations', function (Blueprint $t) {
    $t->ulid('id')->primary();
    $t->ulid('user_id');
    $t->foreign('user_id')->references('id')->on('users')->cascadeOnDelete();
    $t->string('scenario_id', 24);
    $t->foreign('scenario_id')->references('id')->on('scenarios');
    $t->string('state', 12)->default('active');
    $t->unsignedSmallInteger('learner_turns')->default(0);
    $t->unsignedInteger('duration_sec')->default(0);
    $t->unsignedTinyInteger('score')->nullable();
    $t->timestampTz('started_at');
    $t->timestampTz('ended_at')->nullable();
    $t->index(['user_id', 'started_at']);
});

Schema::create('conversation_turns', function (Blueprint $t) {
    $t->id();
    $t->ulid('conversation_id');
    $t->foreign('conversation_id')->references('id')->on('conversations')->cascadeOnDelete();
    $t->string('role', 8);
    $t->text('text');
    $t->string('emotion', 16)->nullable();
    $t->jsonb('mistakes')->nullable();
    $t->string('audio_url')->nullable();
    $t->timestampTz('created_at')->useCurrent();
    $t->index(['conversation_id', 'id']);
});

Schema::create('conversation_results', function (Blueprint $t) {
    $t->ulid('conversation_id')->primary();
    $t->foreign('conversation_id')->references('id')->on('conversations')->cascadeOnDelete();
    $t->unsignedTinyInteger('speech');
    $t->unsignedTinyInteger('vocabulary');
    $t->unsignedTinyInteger('grammar');
    $t->unsignedTinyInteger('overall');
    $t->jsonb('mistakes')->default('[]');
    $t->jsonb('new_words')->default('[]');
});

Schema::create('vocab_cards', function (Blueprint $t) {
    $t->ulid('id')->primary();
    $t->ulid('user_id');
    $t->foreign('user_id')->references('id')->on('users')->cascadeOnDelete();
    $t->string('word', 64);
    $t->string('translation', 160);
    $t->text('example')->nullable();
    $t->string('form', 64)->nullable();
    $t->unsignedTinyInteger('stage')->default(0);
    $t->unsignedSmallInteger('streak')->default(0);
    $t->unsignedSmallInteger('lapses')->default(0);
    $t->timestampTz('due_at');
    $t->timestampTz('updated_at');
    $t->timestampTz('synced_at');
    $t->softDeletes();
    $t->unique(['user_id', 'word']);
    $t->index(['user_id', 'synced_at']);
    $t->index(['user_id', 'due_at']);
});

Schema::create('daily_progress', function (Blueprint $t) {
    $t->ulid('user_id');
    $t->foreign('user_id')->references('id')->on('users')->cascadeOnDelete();
    $t->date('day');
    $t->unsignedSmallInteger('minutes')->default(0);
    $t->unsignedInteger('xp')->default(0);
    $t->primary(['user_id', 'day']);
});

Schema::create('ai_usage', function (Blueprint $t) {
    $t->id();
    $t->ulid('user_id')->nullable()->index();
    $t->string('kind', 24);
    $t->unsignedInteger('latency_ms');
    $t->unsignedSmallInteger('status');
    $t->timestampTz('created_at')->useCurrent()->index();
});
```

Eslatmalar:

- `vocab_cards.updated_at` mijoz soati (LWW uchun), `synced_at` server soati (kursor uchun). Ikkalasi alohida: mijoz soati noto'g'ri bo'lsa ham sinxronizatsiya yo'qolmaydi.
- `ai_usage` oyma-oy partitsiyalanadi (`pg_partman`), 90 kundan eskisi o'chiriladi.
- Audio fayllar DB'da emas, storage'da. DB'da faqat URL.
- Mijoz audiosi serverda saqlanmaydi (maxfiylik): Gemini'ga yuboriladi va tashlab yuboriladi.

---

## 6. API shartnomasi (`/api/v1`)

Barcha xatolar `application/problem+json`: `{ "type": "quota", "status": 429, "title": "..." }`. `type` ilovadagi `NoticeCode` bilan mos: `quota`, `turn_failed`, `network`.

| Metod          | Yo'l                         | Pool | Vazifa                                                                               |
| -------------- | ---------------------------- | ---- | ------------------------------------------------------------------------------------ |
| GET            | `/bootstrap`                 | fast | Stsenariylar, darajalar, maqsadlar, feature flag, minimal versiya (ETag, 5 daq kesh) |
| POST           | `/auth/google`               | fast | `{ id_token, device }` → `{ token, user }`                                           |
| DELETE         | `/auth/session`              | fast | Chiqish                                                                              |
| GET/PUT/DELETE | `/me`                        | fast | Profil, tahrirlash, akkauntni o'chirish                                              |
| GET            | `/history`                   | fast | Suhbatlar tarixi (cursor pagination)                                                 |
| GET            | `/stats`                     | fast | Kunlik maqsad, seriya, XP                                                            |
| POST           | `/conversations`             | ai   | `{ scenario_id }` → `conversation_id`, ochilish gapi + audio                         |
| POST           | `/conversations/{id}/turns`  | ai   | `{ text }` yoki `{ audio, mime }` → tutor javobi                                     |
| POST           | `/conversations/{id}/hint`   | ai   | Maslahat jumlasi                                                                     |
| POST           | `/conversations/{id}/finish` | ai   | Natija (idempotent)                                                                  |
| POST           | `/translate`                 | ai   | Tarjima (matn natijasi keshlanadi)                                                   |
| POST           | `/vocabulary/lookup`         | ai   | Bosilgan so'z: asosiy shakl + tarjima (keshlanadi)                                   |
| POST           | `/vocabulary/sync`           | fast | `{ cursor, changes[] }` → `{ cards[], cursor }`                                      |
| POST           | `/vocabulary/reviews`        | fast | Raund javoblari → server XP va jadvalni hisoblaydi                                   |

Tur javobi:

```json
{
  "data": {
    "id": 4812,
    "transcript": "Я хочу кофе",
    "reply": "Отлично! Вам с молоком или без? ☕",
    "emotion": "happy",
    "audio_url": "https://cdn.mentalk.app/speech/9f2c….wav",
    "audio_ms": 3400
  }
}
```

---

## 7. Yadro kodi

### 7.1 Interfeyslar va DTO

```php
<?php

declare(strict_types=1);

namespace App\Contracts;

use App\DTO\AiRequest;

interface AiClient
{
    public function json(AiRequest $request): array;

    public function text(AiRequest $request): string;
}
```

```php
<?php

declare(strict_types=1);

namespace App\Contracts;

use App\DTO\SpeechClip;

interface SpeechSynthesizer
{
    public function speak(string $text, string $voice): SpeechClip;
}
```

```php
<?php

declare(strict_types=1);

namespace App\Contracts;

use App\DTO\Identity;

interface IdentityVerifier
{
    public function verify(string $idToken): Identity;
}
```

```php
<?php

declare(strict_types=1);

namespace App\DTO;

final readonly class AiRequest
{
    public function __construct(
        public string $system,
        public array $contents,
        public ?array $schema = null,
        public float $temperature = 0.8,
        public ?string $model = null,
    ) {}

    public function payload(): array
    {
        return [
            'systemInstruction' => ['parts' => [['text' => $this->system]]],
            'contents' => $this->contents,
            'generationConfig' => array_filter([
                'temperature' => $this->temperature,
                'responseMimeType' => $this->schema ? 'application/json' : null,
                'responseSchema' => $this->schema,
            ], static fn ($value) => $value !== null),
        ];
    }
}
```

```php
<?php

declare(strict_types=1);

namespace App\DTO;

final readonly class SpeechClip
{
    public function __construct(public string $url, public int $durationMs) {}
}
```

### 7.2 Gemini: kalitlar puli va transport

```php
<?php

declare(strict_types=1);

namespace App\Services\Ai;

use App\Exceptions\AiUnavailable;
use Illuminate\Support\Facades\Cache;

final readonly class KeyPool
{
    public function __construct(private array $keys, private int $cooldown) {}

    public function acquire(): string
    {
        $count = count($this->keys);
        $start = Cache::increment('ai:keys:cursor');

        for ($i = 0; $i < $count; $i++) {
            $key = $this->keys[($start + $i) % $count];

            if (! Cache::has($this->coolingKey($key))) {
                return $key;
            }
        }

        throw new AiUnavailable;
    }

    public function cool(string $key): void
    {
        Cache::put($this->coolingKey($key), 1, $this->cooldown);
    }

    private function coolingKey(string $key): string
    {
        return 'ai:keys:cool:'.substr(hash('sha256', $key), 0, 12);
    }
}
```

```php
<?php

declare(strict_types=1);

namespace App\Services\Ai;

use App\Exceptions\AiOverloaded;
use App\Exceptions\AiRateLimited;
use App\Exceptions\AiRejected;
use GuzzleHttp\Client;

final class GeminiTransport
{
    private readonly Client $http;

    public function __construct(private readonly KeyPool $keys, array $config)
    {
        $this->http = new Client([
            'base_uri' => rtrim($config['base_url'], '/').'/',
            'timeout' => $config['timeout'],
            'connect_timeout' => 3,
            'http_errors' => false,
            'headers' => ['Content-Type' => 'application/json'],
        ]);
    }

    public function generate(string $model, array $payload): array
    {
        $key = $this->keys->acquire();
        $response = $this->http->post("models/{$model}:generateContent", [
            'json' => $payload,
            'headers' => ['x-goog-api-key' => $key],
        ]);
        $status = $response->getStatusCode();

        return match (true) {
            $status === 200 => json_decode((string) $response->getBody(), true, 512, JSON_THROW_ON_ERROR),
            $status === 429 => $this->rateLimited($key),
            $status >= 500 => throw new AiOverloaded($status),
            default => throw new AiRejected($status),
        };
    }

    private function rateLimited(string $key): never
    {
        $this->keys->cool($key);

        throw new AiRateLimited;
    }
}
```

Istisnolar (`app/Exceptions`):

```php
class AiUnavailable extends RuntimeException {}
final class AiRateLimited extends AiUnavailable {}
final class AiOverloaded extends AiUnavailable {}
final class AiRejected extends RuntimeException {}
```

```php
<?php

declare(strict_types=1);

namespace App\Services\Ai;

use App\Contracts\AiClient;
use App\DTO\AiRequest;
use App\Exceptions\AiUnavailable;

final readonly class GeminiClient implements AiClient
{
    public function __construct(private GeminiTransport $transport, private array $models) {}

    public function json(AiRequest $request): array
    {
        return json_decode($this->textOf($request), true, 512, JSON_THROW_ON_ERROR);
    }

    public function text(AiRequest $request): string
    {
        return trim($this->textOf($request));
    }

    private function textOf(AiRequest $request): string
    {
        $response = $this->generate($request);

        return $response['candidates'][0]['content']['parts'][0]['text'] ?? '';
    }

    private function generate(AiRequest $request): array
    {
        foreach ([$request->model ?? $this->models['primary'], $this->models['fallback']] as $model) {
            try {
                return $this->transport->generate($model, $request->payload());
            } catch (AiUnavailable) {
                continue;
            }
        }

        throw new AiUnavailable;
    }
}
```

Sarf va kechikish dekoratori (javobni kechiktirmaydi):

```php
<?php

declare(strict_types=1);

namespace App\Services\Ai;

use App\Contracts\AiClient;
use App\DTO\AiRequest;
use Illuminate\Support\Facades\DB;
use Throwable;

final readonly class MeteredAiClient implements AiClient
{
    public function __construct(private AiClient $inner) {}

    public function json(AiRequest $request): array
    {
        return $this->measure('json', fn () => $this->inner->json($request));
    }

    public function text(AiRequest $request): string
    {
        return $this->measure('text', fn () => $this->inner->text($request));
    }

    private function measure(string $kind, callable $call): mixed
    {
        $start = hrtime(true);
        $status = 200;

        try {
            return $call();
        } catch (Throwable $e) {
            $status = 502;

            throw $e;
        } finally {
            $row = [
                'user_id' => auth()->id(),
                'kind' => $kind,
                'latency_ms' => intdiv(hrtime(true) - $start, 1_000_000),
                'status' => $status,
            ];
            dispatch(static fn () => DB::table('ai_usage')->insert($row))->afterResponse();
        }
    }
}
```

### 7.3 Promptlar (dinamik)

Promptlar `ai_prompts` jadvalida; admin o'zgartirsa kesh bekor bo'ladi. Qoidalar kodda emas, ma'lumotda.

```php
<?php

declare(strict_types=1);

namespace App\Services\Ai;

use App\Models\AiPrompt;
use Illuminate\Support\Facades\Cache;

final class PromptStore
{
    public function get(string $key): string
    {
        return Cache::rememberForever(
            "prompt:{$key}",
            fn () => AiPrompt::query()->where('key', $key)->where('active', true)->value('body')
                ?? throw new \LogicException("Missing prompt [{$key}]"),
        );
    }
}
```

```php
<?php

declare(strict_types=1);

namespace App\Observers;

use App\Models\AiPrompt;
use Illuminate\Support\Facades\Cache;

final class AiPromptObserver
{
    public function saved(AiPrompt $prompt): void
    {
        Cache::forget("prompt:{$prompt->key}");
    }
}
```

```php
<?php

declare(strict_types=1);

namespace App\Services\Ai;

use App\DTO\TurnInput;
use App\Enums\TurnKind;
use App\Models\LearnerProfile;
use App\Models\Scenario;

final readonly class PromptBuilder
{
    public function __construct(private PromptStore $prompts) {}

    public function system(Scenario $scenario, LearnerProfile $learner): string
    {
        return strtr($this->prompts->get('tutor.system'), [
            '{scenario}' => $scenario->brief,
            '{topics}' => $scenario->next_topics,
            '{learner}' => $learner->describe(),
            '{level}' => $this->prompts->get('level.'.($learner->level?->value ?? 'beginner')),
            '{gender}' => $this->prompts->get('gender.'.($learner->gender?->value ?? 'unspecified')),
            '{ui_language}' => $learner->uiLanguageName(),
            '{flow_rules}' => $this->prompts->get('tutor.flow'),
        ]);
    }

    public function userParts(TurnInput $input): array
    {
        return match ($input->kind) {
            TurnKind::Opening => [['text' => $this->prompts->get('turn.opening')]],
            TurnKind::Text => [['text' => "The learner typed: {$input->text}"]],
            TurnKind::Audio => [
                ['text' => $this->prompts->get('turn.audio')],
                ['inlineData' => ['mimeType' => $input->mime, 'data' => $input->audio]],
            ],
        };
    }
}
```

Boshlang'ich seed: `tutor.system`, `tutor.flow`, `turn.opening`, `turn.audio`, `level.*`, `gender.*`, `hint`, `evaluation`, `lookup`, `translate`. Matnlari hozirgi ilovadagi `src/services/gemini/prompts.ts` dan ko'chiriladi (suhbat hech qachon o'zi tugamaydi, har javob savol bilan tugaydi, xatolarga ishora qilinmaydi). TTS'ga faqat gapning o'zi yuboriladi, uslub ko'rsatmasi emas (aks holda model ko'rsatmani o'qib yuboradi).

### 7.4 Suhbat: tur yuborish

```php
<?php

declare(strict_types=1);

namespace App\Services\Ai\Schemas;

final class TurnSchema
{
    public static function get(): array
    {
        return [
            'type' => 'OBJECT',
            'properties' => [
                'transcript' => ['type' => 'STRING'],
                'reply' => ['type' => 'STRING'],
                'emotion' => ['type' => 'STRING', 'enum' => ['neutral', 'happy', 'encouraging', 'curious', 'empathetic', 'surprised', 'playful']],
                'mistakes' => ['type' => 'ARRAY', 'items' => MistakeSchema::get()],
            ],
            'required' => ['transcript', 'reply', 'emotion', 'mistakes'],
        ];
    }
}
```

```php
<?php

declare(strict_types=1);

namespace App\Services\Conversation;

use App\DTO\TurnInput;
use App\DTO\TurnResult;
use App\Enums\TurnKind;
use App\Enums\TurnRole;
use App\Models\Conversation;
use App\Models\Turn;
use Illuminate\Support\Facades\DB;

final class TurnHistory
{
    private const WINDOW = 24;

    public function contents(Conversation $conversation): array
    {
        $contents = $conversation->turns()
            ->latest('id')->limit(self::WINDOW)->get(['role', 'text'])
            ->reverse()
            ->map(fn (Turn $turn) => ['role' => $turn->role->geminiRole(), 'parts' => [['text' => $turn->text]]])
            ->values()->all();

        $startsWithTutor = ($contents[0]['role'] ?? null) === 'model';

        return $startsWithTutor
            ? [['role' => 'user', 'parts' => [['text' => '(the learner joins the conversation)']]], ...$contents]
            : $contents;
    }

    public function append(Conversation $conversation, TurnInput $input, TurnResult $result, string $audioUrl): Turn
    {
        return DB::transaction(function () use ($conversation, $input, $result, $audioUrl) {
            $learnerSaid = $input->kind === TurnKind::Text ? $input->text : $result->transcript;

            if ($input->kind !== TurnKind::Opening && $learnerSaid !== '') {
                $conversation->turns()->create([
                    'role' => TurnRole::Learner,
                    'text' => $learnerSaid,
                    'mistakes' => $result->mistakes,
                ]);
                $conversation->increment('learner_turns');
            }

            return $conversation->turns()->create([
                'role' => TurnRole::Tutor,
                'text' => $result->reply,
                'emotion' => $result->emotion,
                'audio_url' => $audioUrl,
            ]);
        });
    }
}
```

```php
<?php

declare(strict_types=1);

namespace App\Actions\Conversation;

use App\Contracts\AiClient;
use App\Contracts\SpeechSynthesizer;
use App\DTO\AiRequest;
use App\DTO\TurnInput;
use App\DTO\TurnResult;
use App\Models\Conversation;
use App\Models\Turn;
use App\Services\Ai\PromptBuilder;
use App\Services\Ai\Schemas\TurnSchema;
use App\Services\Conversation\TurnHistory;
use Illuminate\Support\Facades\Cache;

final readonly class SendTurn
{
    public function __construct(
        private AiClient $ai,
        private PromptBuilder $prompts,
        private SpeechSynthesizer $speech,
        private TurnHistory $history,
    ) {}

    public function __invoke(Conversation $conversation, TurnInput $input): Turn
    {
        return Cache::lock("conversation:{$conversation->id}", 40)->block(3, function () use ($conversation, $input) {
            $request = new AiRequest(
                system: $this->prompts->system($conversation->scenario, $conversation->user->profile),
                contents: [
                    ...$this->history->contents($conversation),
                    ['role' => 'user', 'parts' => $this->prompts->userParts($input)],
                ],
                schema: TurnSchema::get(),
            );
            $result = TurnResult::from($this->ai->json($request));
            $clip = $this->speech->speak($result->reply, config('ai.voice'));

            return $this->history->append($conversation, $input, $result, $clip->url)
                ->setAttribute('audio_ms', $clip->durationMs);
        });
    }
}
```

Qulf bir suhbatda ikki parallel tur (qo'sh bosish) tartibini buzmasligi uchun.

### 7.5 Ovoz: kesh va dekorator

```php
<?php

declare(strict_types=1);

namespace App\Services\Speech;

final class Wav
{
    public static function fromPcm(string $pcm, int $rate = 24_000): string
    {
        $size = strlen($pcm);

        return 'RIFF'.pack('V', 36 + $size).'WAVEfmt '
            .pack('VvvVVvv', 16, 1, 1, $rate, $rate * 2, 2, 16)
            .'data'.pack('V', $size).$pcm;
    }
}
```

```php
<?php

declare(strict_types=1);

namespace App\Services\Speech;

use App\Contracts\SpeechSynthesizer;
use App\DTO\SpeechClip;
use App\Exceptions\AiRejected;
use App\Services\Ai\GeminiTransport;
use Illuminate\Support\Facades\Storage;

final readonly class GeminiSynthesizer implements SpeechSynthesizer
{
    public function __construct(private GeminiTransport $transport, private string $model) {}

    public function speak(string $text, string $voice): SpeechClip
    {
        $response = $this->transport->generate($this->model, [
            'contents' => [['parts' => [['text' => $text]]]],
            'generationConfig' => [
                'responseModalities' => ['AUDIO'],
                'speechConfig' => ['voiceConfig' => ['prebuiltVoiceConfig' => ['voiceName' => $voice]]],
            ],
        ]);

        $inline = collect($response['candidates'][0]['content']['parts'] ?? [])->firstWhere('inlineData')['inlineData']
            ?? throw new AiRejected(0);
        $pcm = base64_decode($inline['data'], true);
        $path = hash('sha256', "{$voice}|{$text}").'.wav';

        Storage::disk('speech')->put($path, Wav::fromPcm($pcm));

        return new SpeechClip(Storage::disk('speech')->url($path), intdiv(strlen($pcm) * 1000, 48_000));
    }
}
```

```php
<?php

declare(strict_types=1);

namespace App\Services\Speech;

use App\Contracts\SpeechSynthesizer;
use App\DTO\SpeechClip;
use App\Support\Text;
use Illuminate\Support\Facades\Cache;

final readonly class CachedSynthesizer implements SpeechSynthesizer
{
    private const TTL_DAYS = 30;

    public function __construct(private SpeechSynthesizer $inner) {}

    public function speak(string $text, string $voice): SpeechClip
    {
        $text = Text::withoutEmoji($text);
        $key = 'speech:'.hash('sha256', "{$voice}|{$text}");

        return Cache::get($key) ?? Cache::lock("{$key}:lock", 20)->block(15, function () use ($key, $text, $voice) {
            return Cache::get($key) ?? tap(
                $this->inner->speak($text, $voice),
                fn (SpeechClip $clip) => Cache::put($key, $clip, now()->addDays(self::TTL_DAYS)),
            );
        });
    }
}
```

Bir xil gapni bir vaqtda so'ragan ikki foydalanuvchi uchun Gemini bir marta chaqiriladi (stampede himoyasi). Ochilish gaplari va keng tarqalgan javoblar keshdan keladi.

### 7.6 Suhbatni yakunlash (idempotent)

```php
<?php

declare(strict_types=1);

namespace App\Actions\Conversation;

use App\Contracts\AiClient;
use App\DTO\AiRequest;
use App\Models\Conversation;
use App\Models\ConversationResult;
use App\Services\Ai\PromptStore;
use App\Services\Ai\Schemas\EvaluationSchema;
use App\Services\Conversation\Transcript;
use App\Services\Progress\ProgressTracker;
use Illuminate\Support\Facades\Cache;
use Illuminate\Support\Facades\DB;

final readonly class FinishConversation
{
    public function __construct(
        private AiClient $ai,
        private PromptStore $prompts,
        private ProgressTracker $progress,
    ) {}

    public function __invoke(Conversation $conversation): ConversationResult
    {
        return Cache::lock("finish:{$conversation->id}", 60)->block(5, function () use ($conversation) {
            $conversation->refresh();

            return $conversation->result ?? $this->finish($conversation);
        });
    }

    private function finish(Conversation $conversation): ConversationResult
    {
        $scores = $conversation->learner_turns === 0 ? $this->empty() : $this->evaluate($conversation);
        $seconds = (int) $conversation->started_at->diffInSeconds(now());

        return DB::transaction(function () use ($conversation, $scores, $seconds) {
            $result = $conversation->result()->create($scores);
            $conversation->update([
                'state' => 'finished',
                'ended_at' => now(),
                'duration_sec' => $seconds,
                'score' => $scores['overall'],
            ]);
            $this->progress->record($conversation->user, minutes: intdiv($seconds + 59, 60), xp: 0);

            return $result;
        });
    }

    private function evaluate(Conversation $conversation): array
    {
        $raw = $this->ai->json(new AiRequest(
            system: $this->prompts->get('evaluation'),
            contents: [['role' => 'user', 'parts' => [['text' => Transcript::of($conversation)]]]],
            schema: EvaluationSchema::get(),
            temperature: 0.2,
        ));

        $score = fn (string $key) => max(0, min(10, (int) round($raw[$key] ?? 0)));

        return [
            'speech' => $score('speech'),
            'vocabulary' => $score('vocabulary'),
            'grammar' => $score('grammar'),
            'overall' => (int) round(($score('speech') + $score('vocabulary') + $score('grammar')) / 3),
            'mistakes' => array_slice($raw['mistakes'] ?? [], 0, 3),
            'new_words' => array_slice($raw['newWords'] ?? [], 0, 5),
        ];
    }

    private function empty(): array
    {
        return ['speech' => 0, 'vocabulary' => 0, 'grammar' => 0, 'overall' => 0, 'mistakes' => [], 'new_words' => []];
    }
}
```

AI chaqiruvi DB tranzaksiyasidan **tashqarida**; tranzaksiya faqat yozuvlarni qamrab oladi.

### 7.7 So'zlar: SRS, XP, sinxronizatsiya

`Srs` ilovadagi `srs.ts` bilan bir xil qoidalar (server hakam):

```php
<?php

declare(strict_types=1);

namespace App\Support;

use Carbon\CarbonImmutable;

final readonly class CardState
{
    public function __construct(
        public int $stage,
        public CarbonImmutable $dueAt,
        public int $streak,
        public int $lapses,
    ) {}
}

final class Srs
{
    public const MAX_STAGE = 6;

    private const INTERVALS = [0, 28_800, 86_400, 259_200, 604_800, 1_382_400, 3_024_000];

    private const RETRY_SECONDS = 600;

    public static function review(CardState $card, bool $correct, CarbonImmutable $now): CardState
    {
        if (! $correct) {
            return new CardState(max(0, $card->stage - 2), $now->addSeconds(self::RETRY_SECONDS), 0, $card->lapses + 1);
        }

        if ($card->dueAt->isAfter($now)) {
            return new CardState($card->stage, $card->dueAt, $card->streak + 1, $card->lapses);
        }

        $stage = min(self::MAX_STAGE, $card->stage + 1);

        return new CardState($stage, $now->addSeconds(self::INTERVALS[$stage]), $card->streak + 1, $card->lapses);
    }
}
```

```php
<?php

declare(strict_types=1);

namespace App\Support;

final class Xp
{
    private const BASE = 10;

    private const PERFECT_BONUS = 20;

    private const MAX_COMBO_BONUS = 5;

    public static function forRound(array $corrects): int
    {
        $combo = 0;
        $xp = 0;

        foreach ($corrects as $correct) {
            $combo = $correct ? $combo + 1 : 0;
            $xp += $correct ? self::BASE + min(max($combo - 1, 0), self::MAX_COMBO_BONUS) * 2 : 0;
        }

        return $xp + (in_array(false, $corrects, true) || $corrects === [] ? 0 : self::PERFECT_BONUS);
    }
}
```

```php
<?php

declare(strict_types=1);

namespace App\Support;

use Carbon\CarbonImmutable;

final class Streaks
{
    public static function next(int $streak, ?CarbonImmutable $lastActive, CarbonImmutable $today): int
    {
        return match (true) {
            $lastActive?->isSameDay($today) => max($streak, 1),
            $lastActive?->isSameDay($today->subDay()) => $streak + 1,
            default => 1,
        };
    }
}
```

Kunlik progress va seriya bitta joyda:

```php
<?php

declare(strict_types=1);

namespace App\Services\Progress;

use App\Models\User;
use App\Support\Streaks;
use Carbon\CarbonImmutable;
use Illuminate\Support\Facades\DB;

final class ProgressTracker
{
    public function record(User $user, int $minutes, int $xp): void
    {
        $profile = $user->profile;
        $today = CarbonImmutable::now($profile->timezone)->startOfDay();

        DB::transaction(function () use ($user, $profile, $today, $minutes, $xp) {
            DB::statement(
                'insert into daily_progress (user_id, day, minutes, xp) values (?, ?, ?, ?)
                 on conflict (user_id, day) do update
                 set minutes = daily_progress.minutes + excluded.minutes, xp = daily_progress.xp + excluded.xp',
                [$user->id, $today->toDateString(), $minutes, $xp],
            );

            $profile->update([
                'xp' => $profile->xp + $xp,
                'streak' => Streaks::next($profile->streak, $profile->last_active_on?->toImmutable(), $today),
                'last_active_on' => $today,
            ]);
        });
    }
}
```

Raund javoblari (server XP va jadvalni o'zi hisoblaydi, mijozga ishonmaydi):

```php
<?php

declare(strict_types=1);

namespace App\Actions\Vocabulary;

use App\Models\User;
use App\Services\Progress\ProgressTracker;
use App\Support\CardState;
use App\Support\Srs;
use App\Support\Xp;
use Carbon\CarbonImmutable;
use Illuminate\Support\Facades\DB;

final readonly class ReviewCards
{
    private const MAX_ANSWERS = 30;

    public function __construct(private ProgressTracker $progress) {}

    public function __invoke(User $user, array $answers): int
    {
        $answers = collect($answers)->take(self::MAX_ANSWERS)->sortBy('answered_at')->values();
        $cards = $user->cards()->whereIn('word', $answers->pluck('word'))->get()->keyBy('word');
        $xp = Xp::forRound($answers->pluck('correct')->map(fn ($c) => (bool) $c)->all());

        DB::transaction(function () use ($answers, $cards, $user, $xp) {
            foreach ($answers as $answer) {
                $card = $cards->get($answer['word']);

                if ($card === null) {
                    continue;
                }

                $next = Srs::review(
                    new CardState($card->stage, $card->due_at->toImmutable(), $card->streak, $card->lapses),
                    (bool) $answer['correct'],
                    CarbonImmutable::parse($answer['answered_at']),
                );

                $card->forceFill([
                    'stage' => $next->stage,
                    'due_at' => $next->dueAt,
                    'streak' => $next->streak,
                    'lapses' => $next->lapses,
                    'updated_at' => now(),
                    'synced_at' => now(),
                ])->save();
            }

            $this->progress->record($user, minutes: 0, xp: $xp);
        });

        return $xp;
    }
}
```

Offline-first sinxronizatsiya (oxirgi yozgan yutadi, tombstone bilan o'chirish):

```php
<?php

declare(strict_types=1);

namespace App\Actions\Vocabulary;

use App\DTO\CardChange;
use App\DTO\SyncResult;
use App\Models\User;
use App\Models\VocabCard;
use Carbon\CarbonImmutable;
use Illuminate\Support\Collection;
use Illuminate\Support\Str;

final readonly class SyncCards
{
    private const PAGE = 500;

    private const UPDATABLE = ['translation', 'example', 'form', 'stage', 'streak', 'lapses', 'due_at', 'updated_at', 'synced_at', 'deleted_at'];

    public function __invoke(User $user, ?CarbonImmutable $cursor, Collection $changes): SyncResult
    {
        $now = CarbonImmutable::now();
        $existing = $user->cards()->withTrashed()->whereIn('word', $changes->pluck('word'))->get()->keyBy('word');

        $rows = $changes
            ->filter(fn (CardChange $change) => $existing->get($change->word)?->updated_at?->lt($change->updatedAt) ?? true)
            ->map(fn (CardChange $change) => $change->toRow($user->id, $existing->get($change->word)?->id ?? (string) Str::ulid(), $now))
            ->values()->all();

        if ($rows !== []) {
            VocabCard::upsert($rows, ['user_id', 'word'], self::UPDATABLE);
        }

        $cards = $user->cards()->withTrashed()
            ->when($cursor, fn ($query) => $query->where('synced_at', '>', $cursor))
            ->where('synced_at', '<=', $now)
            ->orderBy('synced_at')->limit(self::PAGE)->get();

        return new SyncResult($cards, $cards->count() === self::PAGE ? $cards->last()->synced_at : $now);
    }
}
```

Bosilgan so'zni qidirish (hamma foydalanuvchilar uchun umumiy kesh: bir xil so'z+gap ikkinchi marta Gemini'ga bormaydi):

```php
<?php

declare(strict_types=1);

namespace App\Actions\Vocabulary;

use App\Contracts\AiClient;
use App\DTO\AiRequest;
use App\Services\Ai\PromptStore;
use App\Services\Ai\Schemas\LookupSchema;
use Illuminate\Support\Facades\Cache;

final readonly class LookupWord
{
    public function __construct(private AiClient $ai, private PromptStore $prompts) {}

    public function __invoke(string $word, string $sentence, string $language): array
    {
        $key = 'lookup:'.sha1(mb_strtolower($word)."|{$sentence}|{$language}");

        return Cache::remember($key, now()->addDays(90), fn () => $this->ai->json(new AiRequest(
            system: strtr($this->prompts->get('lookup'), ['{gloss}' => $this->gloss($language)]),
            contents: [['role' => 'user', 'parts' => [['text' => "Word: {$word}\nSentence: {$sentence}"]]]],
            schema: LookupSchema::get(),
            temperature: 0.1,
        )));
    }

    private function gloss(string $language): string
    {
        return match ($language) {
            'ru' => 'a very short, simple Russian explanation or synonym',
            'en' => 'English, one to three words',
            default => 'Uzbek, one to three words',
        };
    }
}
```

### 7.8 Autentifikatsiya

```php
<?php

declare(strict_types=1);

namespace App\Services\Auth;

use App\Contracts\IdentityVerifier;
use App\DTO\Identity;
use Google\Client;
use Illuminate\Auth\AuthenticationException;

final readonly class GoogleIdentityVerifier implements IdentityVerifier
{
    public function __construct(private array $clientIds) {}

    public function verify(string $idToken): Identity
    {
        foreach ($this->clientIds as $clientId) {
            $payload = (new Client(['client_id' => $clientId]))->verifyIdToken($idToken);

            if ($payload) {
                return new Identity($payload['sub'], $payload['email'], $payload['name'] ?? $payload['email']);
            }
        }

        throw new AuthenticationException('Invalid Google token');
    }
}
```

```php
<?php

declare(strict_types=1);

namespace App\Actions\Auth;

use App\Contracts\IdentityVerifier;
use App\Models\User;

final readonly class LoginWithGoogle
{
    private const TOKEN_DAYS = 90;

    public function __construct(private IdentityVerifier $verifier) {}

    public function __invoke(string $idToken, string $device): array
    {
        $identity = $this->verifier->verify($idToken);

        $user = User::updateOrCreate(
            ['google_id' => $identity->subject],
            ['email' => $identity->email, 'name' => $identity->name],
        );
        $user->profile()->firstOrCreate([]);

        return [$user, $user->createToken($device, ['*'], now()->addDays(self::TOKEN_DAYS))->plainTextToken];
    }
}
```

### 7.9 HTTP qatlami

Controller yupqa:

```php
<?php

declare(strict_types=1);

namespace App\Http\Controllers\Conversation;

use App\Actions\Conversation\SendTurn;
use App\Http\Controllers\Controller;
use App\Http\Requests\StoreTurnRequest;
use App\Http\Resources\TurnResource;
use App\Models\Conversation;

final class StoreTurnController extends Controller
{
    public function __invoke(StoreTurnRequest $request, Conversation $conversation, SendTurn $send): TurnResource
    {
        $this->authorize('update', $conversation);

        return new TurnResource($send($conversation, $request->toInput()));
    }
}
```

```php
<?php

declare(strict_types=1);

namespace App\Http\Requests;

use App\DTO\TurnInput;
use App\Enums\TurnKind;
use Illuminate\Foundation\Http\FormRequest;

final class StoreTurnRequest extends FormRequest
{
    public function rules(): array
    {
        return [
            'text' => ['required_without:audio', 'string', 'max:500'],
            'audio' => ['required_without:text', 'string', 'max:4000000'],
            'mime' => ['required_with:audio', 'in:audio/mp4,audio/m4a,audio/aac,audio/mpeg'],
        ];
    }

    public function toInput(): TurnInput
    {
        return $this->has('audio')
            ? new TurnInput(TurnKind::Audio, audio: $this->string('audio')->toString(), mime: $this->string('mime')->toString())
            : new TurnInput(TurnKind::Text, text: trim($this->string('text')->toString()));
    }
}
```

```php
<?php

declare(strict_types=1);

namespace App\Http\Resources;

use Illuminate\Http\Request;
use Illuminate\Http\Resources\Json\JsonResource;

final class TurnResource extends JsonResource
{
    public function toArray(Request $request): array
    {
        return [
            'id' => $this->id,
            'reply' => $this->text,
            'emotion' => $this->emotion,
            'audio_url' => $this->audio_url,
            'audio_ms' => $this->audio_ms,
        ];
    }
}
```

`routes/api.php`:

```php
<?php

declare(strict_types=1);

use Illuminate\Support\Facades\Route;

Route::prefix('v1')->group(function () {
    Route::get('bootstrap', BootstrapController::class)->middleware('etag');
    Route::post('auth/google', GoogleLoginController::class)->middleware('throttle:auth');

    Route::middleware('auth:sanctum')->group(function () {
        Route::delete('auth/session', LogoutController::class);
        Route::get('me', ShowProfileController::class);
        Route::put('me', UpdateProfileController::class);
        Route::delete('me', DeleteAccountController::class);
        Route::get('history', HistoryController::class);
        Route::get('stats', StatsController::class);
        Route::post('vocabulary/sync', SyncCardsController::class);
        Route::post('vocabulary/reviews', ReviewCardsController::class);

        Route::middleware('throttle:ai')->group(function () {
            Route::post('conversations', StartConversationController::class)->middleware('quota:turns');
            Route::post('conversations/{conversation}/turns', StoreTurnController::class)->middleware('quota:turns');
            Route::post('conversations/{conversation}/hint', HintController::class);
            Route::post('conversations/{conversation}/finish', FinishConversationController::class);
            Route::post('translate', TranslateController::class)->middleware('quota:lookups');
            Route::post('vocabulary/lookup', LookupWordController::class)->middleware('quota:lookups');
        });
    });
});
```

Cheklovlar va xato formati:

```php
<?php

declare(strict_types=1);

namespace App\Http\Middleware;

use App\Support\Problem;
use Closure;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\Redis;
use Symfony\Component\HttpFoundation\Response;

final class DailyQuota
{
    private const TTL_SECONDS = 90_000;

    public function handle(Request $request, Closure $next, string $bucket): Response
    {
        $key = "quota:{$bucket}:{$request->user()->id}:".now()->format('Ymd');
        $used = Redis::incr($key);

        if ($used === 1) {
            Redis::expire($key, self::TTL_SECONDS);
        }

        return $used > config("quota.{$bucket}") ? Problem::make(429, 'quota') : $next($request);
    }
}
```

```php
<?php

declare(strict_types=1);

namespace App\Http\Middleware;

use Closure;
use Illuminate\Http\Request;
use Symfony\Component\HttpFoundation\Response;

final class ETag
{
    public function handle(Request $request, Closure $next): Response
    {
        $response = $next($request);
        $response->setEtag(md5((string) $response->getContent()))->setPublic()->setMaxAge(300);
        $response->isNotModified($request);

        return $response;
    }
}
```

```php
<?php

declare(strict_types=1);

namespace App\Support;

use Illuminate\Http\JsonResponse;

final class Problem
{
    public static function make(int $status, string $type, array $headers = []): JsonResponse
    {
        return response()->json(['type' => $type, 'status' => $status], $status, $headers + ['Content-Type' => 'application/problem+json']);
    }
}
```

`bootstrap/app.php` (istisnolarni xaritalash):

```php
->withMiddleware(function (Middleware $middleware) {
    $middleware->alias(['quota' => DailyQuota::class, 'etag' => ETag::class]);
})
->withExceptions(function (Exceptions $exceptions) {
    $exceptions->render(fn (AiUnavailable $e) => Problem::make(503, 'unavailable', ['Retry-After' => 5]));
    $exceptions->render(fn (LockTimeoutException $e) => Problem::make(409, 'turn_in_progress'));
    $exceptions->render(fn (AiRejected $e) => Problem::make(502, 'turn_failed'));
})
```

Provayderlarni ulash (`AppServiceProvider`):

```php
public function register(): void
{
    $this->app->singleton(KeyPool::class, fn () => new KeyPool(config('ai.keys'), config('ai.key_cooldown')));
    $this->app->singleton(GeminiTransport::class, fn ($app) => new GeminiTransport($app->make(KeyPool::class), config('ai')));
    $this->app->bind(AiClient::class, fn ($app) => new MeteredAiClient(
        new GeminiClient($app->make(GeminiTransport::class), ['primary' => config('ai.model'), 'fallback' => config('ai.fallback_model')]),
    ));
    $this->app->bind(SpeechSynthesizer::class, fn ($app) => new CachedSynthesizer(
        new GeminiSynthesizer($app->make(GeminiTransport::class), config('ai.tts_model')),
    ));
    $this->app->bind(IdentityVerifier::class, fn () => new GoogleIdentityVerifier(explode(',', (string) env('GOOGLE_CLIENT_IDS'))));
}

public function boot(): void
{
    Model::shouldBeStrict(! $this->app->isProduction());
    RateLimiter::for('ai', fn (Request $request) => Limit::perMinute(20)->by($request->user()->id));
    RateLimiter::for('auth', fn (Request $request) => Limit::perMinute(10)->by($request->ip()));
    AiPrompt::observe(AiPromptObserver::class);
    Scenario::observe(ScenarioObserver::class);
}
```

`GeminiTransport` va `KeyPool` singleton: Octane'da jarayon umri davomida yashaydi, ichida faqat sozlama bor (so'rovga xos holat yo'q), shuning uchun xavfsiz. Bu Gemini bilan ulanishni qayta ishlatishga ham imkon beradi.

### 7.10 Dinamik bootstrap

```php
<?php

declare(strict_types=1);

namespace App\Http\Controllers;

use App\Http\Resources\ScenarioResource;
use App\Models\Scenario;
use Illuminate\Http\JsonResponse;
use Illuminate\Support\Facades\Cache;

final class BootstrapController extends Controller
{
    public function __invoke(): JsonResponse
    {
        return response()->json(Cache::rememberForever('bootstrap', fn () => [
            'scenarios' => ScenarioResource::collection(Scenario::query()->where('active', true)->orderBy('sort')->get())->resolve(),
            'levels' => ['beginner', 'elementary', 'intermediate', 'advanced'],
            'goals' => ['travel', 'work', 'study', 'relocation', 'family', 'fun'],
            'features' => config('features'),
            'min_app_version' => config('app.min_version'),
        ]));
    }
}
```

`ScenarioObserver` `saved`/`deleted` da `Cache::forget('bootstrap')`. Admin yangi stsenariy qo'shsa, ilova keyingi ochilishda (5 daqiqa ichida) uni ko'radi; yangi relizsiz.

---

## 8. Admin panel (Filament)

| Resurs            | Nima boshqariladi                                                                  |
| ----------------- | ---------------------------------------------------------------------------------- |
| Scenarios         | Nom/tavsif (uz/ru/en), rasm, rang, brif, keyingi mavzular, tartib, faol/nofaol     |
| AI Prompts        | Tutor qoidalari, daraja qoidalari, baholash promptlari (tahrir qilinsa kesh bekor) |
| Users             | Ro'yxat, qidiruv, bloklash, kvotani qayta tiklash                                  |
| AI Usage (widget) | So'rovlar soni, o'rtacha va p95 kechikish, xato foizi, kunlik xarajat              |
| Feature flags     | `config/features.php` o'rniga DB'dagi jadval (xohlansa)                            |

Rollar: faqat `admin` (Filament panel `canAccessPanel`). Admin `/admin` yo'li alohida domen yoki IP bilan cheklanadi.

---

## 9. Xavfsizlik

- Gemini kalitlari faqat serverda. Ilovadan `EXPO_PUBLIC_GEMINI_API_KEY` olib tashlanadi.
- Sanctum tokeni: 90 kun, qurilma nomi bilan, chiqishda bekor qilinadi. Mijozda `expo-secure-store`.
- Har endpoint `FormRequest` bilan validatsiya qilinadi; audio hajmi ≤ ~3 MB, matn ≤ 500 belgi.
- `Policy`: foydalanuvchi faqat o'z suhbati va so'zlarini ko'radi (`ConversationPolicy::update` egalikni va `active` holatni tekshiradi).
- Limitlar: daqiqada 20 AI so'rov, kuniga 300 tur / 400 qidiruv (konfigda), loginga IP bo'yicha 10/daq.
- Suiste'molga qarshi: keyingi bosqichda Play Integrity / App Attest tokenini tekshirish.
- HTTPS majburiy, HSTS, CORS faqat kerak bo'lsa (mobil ilova uchun kerak emas).
- Loglarda shaxsiy matn va audio yo'q; Sentry `send_default_pii=false`.
- Akkauntni o'chirish: `DELETE /me` soft-delete qiladi, `PurgeUserData` job 30 kundan keyin hamma bog'liq ma'lumotni butunlay o'chiradi.
- Telescope productionda o'chiq; Horizon va Pulse faqat admin uchun.

---

## 10. Deploy va infratuzilma

`docker-compose.yml` (asosiy xizmatlar):

```yaml
x-app: &app
  build: .
  env_file: .env
  depends_on: [pgbouncer, redis]

services:
  nginx:
    image: nginx:1.27-alpine
    ports: ["80:80", "443:443"]
    volumes: ["./deploy/nginx.conf:/etc/nginx/conf.d/default.conf:ro"]
    depends_on: [api-fast, api-ai]

  api-fast:
    <<: *app
    command: php artisan octane:start --server=swoole --host=0.0.0.0 --port=8000 --workers=8 --max-requests=500

  api-ai:
    <<: *app
    command: php artisan octane:start --server=swoole --host=0.0.0.0 --port=8000 --workers=48 --max-requests=500

  horizon:
    <<: *app
    command: php artisan horizon

  scheduler:
    <<: *app
    command: php artisan schedule:work

  pgbouncer:
    image: edoburu/pgbouncer
    environment:
      DB_HOST: postgres
      POOL_MODE: transaction
      MAX_CLIENT_CONN: 500
      DEFAULT_POOL_SIZE: 25
    depends_on: [postgres]

  postgres:
    image: postgres:16
    volumes: ["pgdata:/var/lib/postgresql/data"]

  redis:
    image: redis:7-alpine
    command: redis-server --maxmemory 512mb --maxmemory-policy allkeys-lru

volumes:
  pgdata:
```

`deploy/nginx.conf` (yo'lga qarab pool tanlash):

```nginx
upstream api_fast { server api-fast:8000; keepalive 32; }
upstream api_ai   { server api-ai:8000;   keepalive 64; }

map $uri $pool {
    default api_fast;
    ~^/api/v1/(conversations|translate|vocabulary/lookup) api_ai;
}

server {
    listen 80;
    gzip on;
    gzip_types application/json;

    location / {
        proxy_pass http://$pool;
        proxy_http_version 1.1;
        proxy_set_header Connection "";
        proxy_set_header Host $host;
        proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
        proxy_read_timeout 40s;
    }
}
```

`Dockerfile`:

```dockerfile
FROM phpswoole/swoole:php8.4
RUN docker-php-ext-install pdo_pgsql pcntl \
 && pecl install redis igbinary && docker-php-ext-enable redis igbinary
COPY --from=composer:2 /usr/bin/composer /usr/bin/composer
WORKDIR /app
COPY . .
RUN composer install --no-dev --classmap-authoritative --no-interaction && php artisan optimize
```

Zero-downtime reliz: yangi image → `php artisan migrate --force` → `octane:reload` (worker'lar ketma-ket almashadi) → `horizon:terminate`.

Octane uchun qoidalar (xotira va holat oqishini oldini olish):

- Singleton ichida so'rovga xos ma'lumot (user, request) saqlanmaydi; statik o'zgaruvchilar yo'q.
- `--max-requests=500`: worker'lar davriy qayta ishga tushadi.
- `Model::preventLazyLoading()` dev/test'da yoqiq: N+1 so'rovlar CI'da ushlanadi.

CI (GitHub Actions): `pint --test` → `phpstan` (level 8) → `pest --parallel` → image build → deploy.

---

## 11. Kuzatuv

- **Health:** `GET /up` (Laravel standart) + chuqur tekshiruv (DB, Redis) alohida endpoint.
- **Horizon** navbat holati, **Pulse** sekin so'rovlar va keshlar, **Sentry** xatolar.
- Metrikalar: AI kechikishi (p50/p95), 429/503 foizi, kalitlar sovish soni, TTS keshga tushish foizi, kunlik faol foydalanuvchi.
- Ogohlantirish: AI xato foizi > 5%, p95 > 8 s, navbat kechikishi > 30 s, Redis xotirasi > 80%.

---

## 12. Test strategiyasi

Birlik testlar (Srs, Xp, Streaks), feature testlar (soxta AI bilan) va yuk testi.

```php
<?php

declare(strict_types=1);

use App\Support\CardState;
use App\Support\Srs;
use Carbon\CarbonImmutable;

it('moves a due card up and pushes the next review away', function () {
    $now = CarbonImmutable::parse('2026-10-10 12:00');
    $next = Srs::review(new CardState(2, $now, 1, 0), true, $now);

    expect($next->stage)->toBe(3)->and($next->dueAt->equalTo($now->addDays(3)))->toBeTrue();
});

it('drops two stages after a miss', function () {
    $now = CarbonImmutable::parse('2026-10-10 12:00');

    expect(Srs::review(new CardState(4, $now, 3, 0), false, $now)->stage)->toBe(2);
});

it('does not inflate the schedule when practised early', function () {
    $now = CarbonImmutable::parse('2026-10-10 12:00');
    $card = new CardState(2, $now->addDays(2), 0, 0);

    expect(Srs::review($card, true, $now)->stage)->toBe(2);
});
```

```php
<?php

declare(strict_types=1);

use App\Contracts\AiClient;
use App\Contracts\SpeechSynthesizer;
use App\DTO\SpeechClip;
use App\Models\Conversation;
use App\Models\User;
use Tests\Fakes\FakeAiClient;

it('stores both turns and returns the tutor reply with audio', function () {
    $this->app->instance(AiClient::class, new FakeAiClient([
        'transcript' => '', 'reply' => 'Привет!', 'emotion' => 'happy', 'mistakes' => [],
    ]));
    $this->app->instance(SpeechSynthesizer::class, new class implements SpeechSynthesizer {
        public function speak(string $text, string $voice): SpeechClip
        {
            return new SpeechClip('https://cdn.test/a.wav', 1200);
        }
    });

    $conversation = Conversation::factory()->for(User::factory()->hasProfile())->create();

    $this->actingAs($conversation->user)
        ->postJson("/api/v1/conversations/{$conversation->id}/turns", ['text' => 'Привет'])
        ->assertOk()
        ->assertJsonPath('data.reply', 'Привет!')
        ->assertJsonPath('data.audio_url', 'https://cdn.test/a.wav');

    expect($conversation->turns()->count())->toBe(2);
});

it('forbids writing into someone else\'s conversation', function () {
    $conversation = Conversation::factory()->create();

    $this->actingAs(User::factory()->create())
        ->postJson("/api/v1/conversations/{$conversation->id}/turns", ['text' => 'Привет'])
        ->assertForbidden();
});
```

Yuk testi (k6): 100 bir vaqtdagi foydalanuvchi, 5 daqiqa:

```javascript
import http from "k6/http";
import { check, sleep } from "k6";

const BASE = __ENV.BASE_URL;
const TOKEN = __ENV.TOKEN;
const headers = {
  Authorization: `Bearer ${TOKEN}`,
  "Content-Type": "application/json",
};

export const options = {
  scenarios: {
    learners: {
      executor: "ramping-vus",
      stages: [
        { duration: "1m", target: 100 },
        { duration: "5m", target: 100 },
        { duration: "30s", target: 0 },
      ],
    },
  },
  thresholds: {
    "http_req_duration{kind:fast}": ["p(95)<300"],
    "http_req_duration{kind:ai}": ["p(95)<8000"],
    http_req_failed: ["rate<0.01"],
  },
};

export default function () {
  const boot = http.get(`${BASE}/api/v1/bootstrap`, { tags: { kind: "fast" } });
  check(boot, {
    "bootstrap 200/304": (r) => r.status === 200 || r.status === 304,
  });

  const start = http.post(
    `${BASE}/api/v1/conversations`,
    JSON.stringify({ scenario_id: "cafe" }),
    { headers, tags: { kind: "ai" } },
  );
  const id = start.json("data.conversation_id");

  for (let i = 0; i < 5; i++) {
    sleep(5);
    const turn = http.post(
      `${BASE}/api/v1/conversations/${id}/turns`,
      JSON.stringify({ text: "Я хочу кофе" }),
      { headers, tags: { kind: "ai" } },
    );
    check(turn, { "turn 200": (r) => r.status === 200 });
    http.post(
      `${BASE}/api/v1/vocabulary/sync`,
      JSON.stringify({ cursor: null, changes: [] }),
      { headers, tags: { kind: "fast" } },
    );
  }

  http.post(`${BASE}/api/v1/conversations/${id}/finish`, null, {
    headers,
    tags: { kind: "ai" },
  });
}
```

Yuk testida Gemini o'rniga **soxta AI server** (1.5–4 s tasodifiy kechikish qaytaradigan) ishlatiladi: shunda PHP, DB va Redis chegarasi o'lchanadi va Gemini kvotasi sarflanmaydi. Alohida bir marta haqiqiy Gemini bilan 10 foydalanuvchilik sinov o'tkaziladi.

---

## 13. Ilovani ulash (Expo)

Ilova allaqachon interfeyslarga tayanadi (`ConversationService`, `AuthService`), shuning uchun UI o'zgarmaydi:

1. `src/services/api/client.ts`: `fetch` o'rami, `Authorization` sarlavhasi, `problem+json` xatolarini `NoticeCode`ga (`quota`, `turnFailed`, `network`) o'girish.
2. `ApiConversationService implements ConversationService`: `connect` → `POST /conversations`; `sendAudio/sendText` → `POST /turns`; `requestHint` → `/hint`; `end` → `/finish`. Audio endi mijozda sintez qilinmaydi, `audio_url` to'g'ridan-to'g'ri `useTutorVoice` ga beriladi.
3. `ApiAuthService implements AuthService`: Google ID token → `POST /auth/google`, token `expo-secure-store`ga.
4. Stsenariylar `GET /bootstrap` dan olinadi (`mocks/scenarios.ts` faqat zaxira); `If-None-Match` bilan.
5. `vocabularyStore`: mahalliy (offline) ishlashda davom etadi, `POST /vocabulary/sync` fon rejimida (ilova ochilganda va raunddan keyin). Raund tugagach javoblar `POST /vocabulary/reviews` ga yuboriladi.
6. `EXPO_PUBLIC_GEMINI_API_KEY` o'rniga faqat `EXPO_PUBLIC_API_URL`. Gemini kodi (`src/services/gemini`) o'chiriladi.

---

## 14. Bosqichlar

| Bosqich                   | Tarkib                                                                         | Tayyor mezoni                                         |
| ------------------------- | ------------------------------------------------------------------------------ | ----------------------------------------------------- |
| 0. Asos                   | Repo, Docker, CI, Pint/Larastan/Pest, Octane, PgBouncer, Redis                 | `GET /up` ishlaydi, CI yashil                         |
| 1. Auth + Bootstrap       | Google login, Sanctum, profil, bootstrap + ETag, Filament (Scenarios, Prompts) | Ilova real login qiladi, stsenariylar admindan keladi |
| 2. Suhbat                 | Start/Turn/Hint/Finish, TTS keshi, kalit puli, kvota va limitlar               | To'liq suhbat ilovada API orqali ishlaydi             |
| 3. So'zlar                | Lookup, sync, reviews, XP/seriya                                               | Qurilmalar o'rtasida so'zlar sinxron                  |
| 4. Tarjimon va statistika | Translate, history, stats                                                      | Barcha ekranlar API'da                                |
| 5. Chidamlilik            | Yuk testi (100 VU), sozlash, monitoring, ogohlantirishlar                      | SLO bajariladi (2-bo'lim)                             |
| 6. Ixtiyoriy              | Push eslatmalar (seriya), to'lov/obuna, App Attest, ko'p tilli kontent         | —                                                     |

---

## 15. Ochiq savollar (boshlashdan oldin hal qilinadi)

1. Gemini kvota darajasi qanday va nechta kalit bor? (kalitlar pulining kattaligi shunga bog'liq)
2. Audio saqlash kerakmi (o'quvchi o'z nutqini qayta eshitishi uchun)? Hozir saqlanmaydi.
3. Obuna/to'lov bormi? Bo'lsa, kvotalar tarif bo'yicha o'zgaradi (`config/quota.php` o'rniga `plans` jadvali).
4. Qaysi hudud/provayder (kechikish uchun serverni foydalanuvchilarga yaqin joylashtirish: Toshkent yoki Frankfurt)?
