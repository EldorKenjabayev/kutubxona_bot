# Kutubxona Bot - Loyihani Ishga Tushirish Qo'llanmasi

Bu qo'llanma Kutubxona botini o'rnatish va ishga tushirish bo'yicha ko'rsatmalar beradi.

## Tizim talablari

- Node.js (v14.x yoki yuqori)
- PostgreSQL (v12.x yoki yuqori)
- Internetga ulanish

## O'rnatish

1. Loyiha kodlarini yuklab oling:

```bash
git clone [github-repository-url]
cd kutubxona-bot
```

2. Kerakli paketlarni o'rnating:

```bash
npm install
```

3. PostgreSQL ma'lumotlar bazasini yarating:

```sql
CREATE DATABASE kutubxona_db;
```

4. `.env` faylini sozlang:

`.env.example` faylini `.env` ga nusxalang va quyidagi o'zgaruvchilarni sozlang:

```
# Bot tokenlari
USER_BOT_TOKEN=your_user_bot_token_here
ADMIN_BOT_TOKEN=your_admin_bot_token_here

# Ma'lumotlar bazasi
DB_USERNAME=postgres
DB_PASSWORD=yourpassword
DB_NAME=kutubxona_db
DB_HOST=localhost
DB_PORT=5432

# Server
PORT=3000
NODE_ENV=development
```

Bot tokenlarini olish uchun [@BotFather](https://t.me/BotFather) ga murojaat qiling va ikki bot yarating:
- User bot (`KutubxonaUserBot`)
- Admin bot (`KutubxonaAdminBot`)

5. Ma'lumotlar bazasi strukturasini yarating:

```bash
npm start
```

Bu buyruq ma'lumotlar bazasi jadvallarini avtomatik yaratadi.

## Admin foydalanuvchi yaratish

Admin foydalanuvchi yaratish uchun quyidagi qadamlarni bajaring:

1. Avval foydalanuvchi sifatida user botda ro'yxatdan o'ting.
2. PostgreSQL ma'lumotlar bazasiga ulaning:

```bash
psql -U postgres -d kutubxona_db
```

3. Foydalanuvchiga admin huquqlarini bering:

```sql
UPDATE users SET "isAdmin" = true WHERE "telegramId" = 'your_telegram_id';
```

## Botni ishga tushirish

Ishlab chiqish rejimida ishga tushirish:

```bash
npm run dev
```

Ishlab chiqarish rejimida ishga tushirish:

```bash
npm start
```

## Bot imkoniyatlari

### Foydalanuvchi Bot (KutubxonaUserBot)

- `/start` - Botni ishga tushirish va ro'yxatdan o'tish
- 📚 Kitoblar ro'yxati - Barcha mavjud kitoblarni ko'rish
- 📌 Band qilingan kitoblar - Foydalanuvchi band qilgan kitoblarni ko'rish
- 🔍 Qidiruv - Kitoblarni nomi yoki muallifi bo'yicha qidirish
- ℹ️ Ma'lumot - Bot haqida ma'lumot va qoidalar

### Admin Bot (KutubxonaAdminBot)

- `/start` - Admin panelni ochish
- ➕ Kitob qo'shish - Yangi kitob qo'shish
- 📚 Kitoblar ro'yxati - Barcha kitoblarni ko'rish va tahrirlash
- 🔒 Band qilingan kitoblar - Band qilingan kitoblarni ko'rish va tasdiqlash
- 📊 Statistika - Kutubxona statistikasini ko'rish
- 👥 Foydalanuvchilar - Foydalanuvchilar ro'yxatini ko'rish

## Muhim eslatmalar

- Har bir foydalanuvchi faqat 1 ta kitobni band qila oladi
- Band qilingan kitob 24 soat ichida olib ketilmasa, avtomatik bekor qilinadi
- Kitobni maksimal 10 kun muddatga olish mumkin
- Kitob qaytarish vaqti yaqinlashganda foydalanuvchiga eslatma yuboriladi