import type { CategoryKey } from '@/features/categories/types';
import type { VoiceLanguage } from '@/i18n/languages';
import type { PaymentMethod } from '@/types/money';

import { parseVoiceExpense } from '../voiceExpenseParser';

/** Fixed "today" for relative dates: 22 May 2025 (local). */
const TODAY = new Date(2025, 4, 22);
const DATES = ['2025-05-22', '2025-05-21', '2025-05-20'] as const;

/**
 * [utterance, amountMinor (paise) | null, category | null, days ago, payment method?]
 * null = the parser must leave the field empty (missing or ambiguous), never guess.
 */
type Fixture = [string, number | null, CategoryKey | null, 0 | 1 | 2, PaymentMethod?];

const ENGLISH: Fixture[] = [
  ['I spent 50 rupees on tea.', 5_000, 'food', 0],
  ['Bought groceries for 250 rupees.', 25_000, 'groceries', 0],
  ['Spent 120 on lunch today.', 12_000, 'food', 0],
  ['Paid 500 rupees for electricity.', 50_000, 'bills', 0],
  ['I spent 80 rupees on transport yesterday.', 8_000, 'transportation', 1],
  ['Coffee 60 rupees', 6_000, 'food', 0],
  ['Rs 450 for dinner', 45_000, 'food', 0],
  ['₹300 auto fare', 30_000, 'transportation', 0],
  ['paid 1,200 rupees for medicine', 120_000, 'healthcare', 0],
  ['two hundred rupees for bus', 20_000, 'transportation', 0],
  ['spent one thousand five hundred on shopping', 150_000, 'shopping', 0],
  ['house rent 8000 rupees', 800_000, 'rent', 0],
  ['paid twelve thousand rupees rent', 1_200_000, 'rent', 0],
  ['movie 600 rupees', 60_000, 'entertainment', 0],
  ['haircut 150 rupees', 15_000, 'personal_care', 0],
  ['school fees 2500 rupees', 250_000, 'education', 0],
  ['mobile recharge 299 rupees', 29_900, 'bills', 0],
  ['internet bill 999 rupees', 99_900, 'bills', 0],
  ['petrol 500 rupees yesterday', 50_000, 'transportation', 1],
  ['taxi 350 rupees', 35_000, 'transportation', 0],
  ['bought vegetables for 80 rupees', 8_000, 'groceries', 0],
  ['milk 56 rupees', 5_600, 'groceries', 0],
  ['snacks 45 rupees', 4_500, 'food', 0],
  ['paid 1 lakh rupees for travel', 10_000_000, 'travel', 0],
  ['flight 4500 rupees', 450_000, 'travel', 0],
  ['doctor fees 700 rupees', 70_000, null, 0],
  ['spent 75.50 on juice', 7_550, 'food', 0],
  ['paid 5k for rent', 500_000, 'rent', 0],
  ['spent a hundred rupees on tea', 10_000, 'food', 0],
  ['breakfast forty five rupees', 4_500, 'food', 0],
  ['gas cylinder 1100 rupees', 110_000, 'bills', 0],
  ['pharmacy 340 rupees day before yesterday', 34_000, 'healthcare', 2],
  ['uber 260 rupees today', 26_000, 'transportation', 0],
  ['spent money on lunch', null, 'food', 0],
  ['paid 200 rupees', 20_000, null, 0],
  ['bought 2 kg rice for 120 rupees', 12_000, 'groceries', 0],
  ['clothes 2,499 rupees', 249_900, 'shopping', 0],
  ['salon 400 rupees', 40_000, 'personal_care', 0],
  ['netflix 649 rupees', 64_900, 'entertainment', 0],
  ['tuition 3000 rupees', 300_000, 'education', 0],
  ['books 850 rupees', 85_000, 'education', 0],
  ['metro 40 rupees', 4_000, 'transportation', 0],
  ['train 230 rupees', 23_000, 'transportation', 0],
  ['spent 150 at the market', 15_000, 'bazar', 0],
  ['shop 90 rupees', 9_000, 'dokan', 0],
  ['pizza 399 rupees with card', 39_900, 'food', 0, 'card'],
  ['paid electricity bill 1450 by upi', 145_000, 'bills', 0, 'upi'],
  ['tea 20 and samosa 30', null, 'food', 0],
  ['groceries and medicine 500 rupees', 50_000, null, 0],
  ['spent two lakh fifty thousand rupees on travel', 25_000_000, 'travel', 0],
  ['one hundred and fifty rupees for bus', 15_000, 'transportation', 0],
  ['cash 100 rupees for chai', 10_000, 'food', 0, 'cash'],
];

const BENGALI: Fixture[] = [
  ['আজ ৫০ টাকা চা খেয়েছি।', 5_000, 'food', 0],
  ['বাজারে ২৫০ টাকা খরচ হয়েছে।', 25_000, 'bazar', 0],
  ['দুপুরের খাবারে ১২০ টাকা খরচ।', 12_000, 'food', 0],
  ['বিদ্যুতের বিল ৫০০ টাকা দিয়েছি।', 50_000, 'bills', 0],
  ['গতকাল যাতায়াতে ৮০ টাকা খরচ হয়েছে।', 8_000, 'transportation', 1],
  ['চায়ে ২০ টাকা', 2_000, 'food', 0],
  ['দুধ ৬০ টাকা', 6_000, 'groceries', 0],
  ['সবজি কিনলাম ১৫০ টাকায়', 15_000, 'groceries', 0],
  ['বাসে ৩০ টাকা', 3_000, 'transportation', 0],
  ['অটো ভাড়া ৪০ টাকা', 4_000, 'transportation', 0],
  ['বাড়ি ভাড়া আট হাজার টাকা', 800_000, 'rent', 0],
  ['ওষুধ কিনতে ৩৫০ টাকা লেগেছে', 35_000, 'healthcare', 0],
  ['ডাক্তারের ফি ৫০০ টাকা', 50_000, null, 0],
  ['পাঁচশো টাকার মুদি বাজার', 50_000, 'groceries', 0],
  ['একশো টাকা রিচার্জ', 10_000, 'bills', 0],
  ['দেড়শো টাকার মিষ্টি', 15_000, 'food', 0],
  ['আড়াইশো টাকার সবজি', 25_000, 'groceries', 0],
  ['সাড়ে তিনশো টাকা ট্যাক্সি', 35_000, 'transportation', 0],
  ['দুই হাজার টাকার জামা', 200_000, 'shopping', 0],
  ['গতকাল সিনেমায় তিনশো টাকা', 30_000, 'entertainment', 1],
  ['স্কুলের ফি দেড় হাজার টাকা', 150_000, 'education', 0],
  ['চুল কাটা ১০০ টাকা', 10_000, 'personal_care', 0],
  ['টিফিনে ৪০ টাকা', 4_000, 'food', 0],
  ['পেট্রোল ৫০০ টাকা', 50_000, 'transportation', 0],
  ['গ্যাসের বিল ৯০০ টাকা', 90_000, 'bills', 0],
  ['ইন্টারনেট বিল ৬০০ টাকা', 60_000, 'bills', 0],
  ['ট্রেনের টিকিট ১২০ টাকা', 12_000, 'transportation', 0],
  ['ডিম ৮৪ টাকা', 8_400, 'groceries', 0],
  ['আজকে বিরিয়ানি ২৮০ টাকা', 28_000, 'food', 0],
  ['দোকানে ৭৫ টাকা', 7_500, 'dokan', 0],
  ['কলেজের বই ৪৫০ টাকা', 45_000, 'education', 0],
  ['হাসপাতালে দুই হাজার টাকা', 200_000, 'healthcare', 0],
  ['রেস্টুরেন্টে ১২০০ টাকা', 120_000, 'food', 0],
  ['পঞ্চাশ টাকা চা', 5_000, 'food', 0],
  ['কুড়ি টাকা অটো', 2_000, 'transportation', 0],
  ['পঁচাত্তর টাকা দুধ', 7_500, 'groceries', 0],
  ['বারোশো টাকা বাজার', 120_000, 'bazar', 0],
  ['চাল ডাল ৬৫০ টাকা', 65_000, 'groceries', 0],
  ['নগদে ২০০ টাকা বাজার', 20_000, 'bazar', 0, 'cash'],
  ['ইউপিআই দিয়ে ৩০০ টাকা রিচার্জ', 30_000, 'bills', 0, 'upi'],
  ['কিছু খরচ হয়েছে', null, null, 0],
  ['চা আর সিঙ্গারা ৩০ টাকা', 3_000, 'food', 0],
  ['পরশু ১০০ টাকা বাসে', 10_000, 'transportation', 2],
  ['কাল ২০০ টাকা বাজার', 20_000, 'bazar', 1],
  ['এক লাখ টাকা ভ্রমণে', 10_000_000, 'travel', 0],
  ['ফুচকা ৫০ টাকা', 5_000, 'food', 0],
  ['সেলুনে ১৫০ টাকা', 15_000, 'personal_care', 0],
  ['মেট্রোতে ২৫ টাকা', 2_500, 'transportation', 0],
  ['শাড়ি তিন হাজার টাকা', 300_000, 'shopping', 0],
  ['মুভি দেখতে ৪০০ টাকা', 40_000, 'entertainment', 0],
  ['আজ ১,২৫০ টাকা ওষুধ', 125_000, 'healthcare', 0],
  ['দশ টাকা আর বিশ টাকা চা', null, 'food', 0],
];

const HINDI: Fixture[] = [
  ['आज चाय पर 50 रुपये खर्च किए', 5_000, 'food', 0],
  ['किराना 250 रुपये', 25_000, 'groceries', 0],
  ['लंच में 120 रुपये', 12_000, 'food', 0],
  ['बिजली का बिल 500 रुपये', 50_000, 'bills', 0],
  ['कल ऑटो में 80 रुपये', 8_000, 'transportation', 1],
  ['सब्ज़ी 60 रुपये', 6_000, 'groceries', 0],
  ['दूध के 56 रुपये', 5_600, 'groceries', 0],
  ['डेढ़ सौ रुपये चाय', 15_000, 'food', 0],
  ['ढाई सौ रुपये की मिठाई', 25_000, 'food', 0],
  ['साढ़े तीन सौ रुपये टैक्सी', 35_000, 'transportation', 0],
  ['दो हज़ार पांच सौ रुपये किराना', 250_000, 'groceries', 0],
  ['घर का किराया आठ हज़ार रुपये', 800_000, 'rent', 0],
  ['दवाई 340 रुपये', 34_000, 'healthcare', 0],
  ['डॉक्टर को 500 रुपये', 50_000, 'healthcare', 0],
  ['स्कूल की फीस 3000 रुपये', 300_000, 'education', 0],
  ['किताबें 450 रुपये', 45_000, 'education', 0],
  ['पेट्रोल 500 रुपये', 50_000, 'transportation', 0],
  ['बस का किराया 30 रुपये', 3_000, 'transportation', 0],
  ['मोबाइल रिचार्ज 299 रुपये', 29_900, 'bills', 0],
  ['गैस सिलेंडर 1100 रुपये', 110_000, 'bills', 0],
  ['इंटरनेट बिल 999 रुपये', 99_900, 'bills', 0],
  ['कपड़े 1200 रुपये', 120_000, 'shopping', 0],
  ['जूते दो हज़ार रुपये', 200_000, 'shopping', 0],
  ['फिल्म 300 रुपये', 30_000, 'entertainment', 0],
  ['सैलून 150 रुपये', 15_000, 'personal_care', 0],
  ['यात्रा पर 5000 रुपये', 500_000, 'travel', 0],
  ['मेट्रो 40 रुपये', 4_000, 'transportation', 0],
  ['ट्रेन टिकट 230 रुपये', 23_000, 'transportation', 0],
  ['बाज़ार में 400 रुपये', 40_000, 'bazar', 0],
  ['दुकान से 90 रुपये', 9_000, 'dokan', 0],
  ['समोसा 20 रुपये', 2_000, 'food', 0],
  ['नाश्ता 60 रुपये', 6_000, 'food', 0],
  ['होटल में खाना 450 रुपये', 45_000, 'food', 0],
  ['पचास रुपये चाय', 5_000, 'food', 0],
  ['बीस रुपये ऑटो', 2_000, 'transportation', 0],
  ['पचहत्तर रुपये दूध', 7_500, 'groceries', 0],
  ['एक लाख रुपये यात्रा', 10_000_000, 'travel', 0],
  ['सवा सौ रुपये की दाल', 12_500, 'groceries', 0],
  ['पौने दो सौ रुपये सब्जी', 17_500, 'groceries', 0],
  ['नकद 200 रुपये बाजार', 20_000, 'bazar', 0, 'cash'],
  ['यूपीआई से 300 रुपये रिचार्ज', 30_000, 'bills', 0, 'upi'],
  ['कुछ खर्च हुआ', null, null, 0],
  ['परसों बस में 100 रुपये', 10_000, 'transportation', 2],
  ['आज 1,250 रुपये दवा', 125_000, 'healthcare', 0],
  ['चावल और दाल 650 रुपये', 65_000, 'groceries', 0],
  ['दस रुपये और बीस रुपये चाय', null, 'food', 0],
  ['राशन 2000 रुपये', 200_000, 'groceries', 0],
  ['बिरयानी 280 रुपये', 28_000, 'food', 0],
  ['कॉलेज फीस 15000 रुपये', 1_500_000, 'education', 0],
  ['अस्पताल में दो हज़ार रुपये', 200_000, 'healthcare', 0],
  ['चाय 20 रुपये कल रात', 2_000, 'food', 1],
  ['तीन सौ रुपये', 30_000, null, 0],
];

function runSuite(language: VoiceLanguage, fixtures: Fixture[]) {
  it(`has at least 50 phrases`, () => {
    expect(fixtures.length).toBeGreaterThanOrEqual(50);
  });

  // Rest parameters keep the callback's arity at 0, so Jest never mistakes an argument for `done`.
  it.each(fixtures)(
    '%s',
    (...[text, amountMinor, categoryKey, daysAgo, paymentMethod]: Fixture) => {
      const draft = parseVoiceExpense(text, { language, currency: 'INR', today: TODAY });
      expect({
        amountMinor: draft.amountMinor,
        categoryKey: draft.categoryKey,
        occurredOn: draft.occurredOn,
      }).toEqual({ amountMinor, categoryKey, occurredOn: DATES[daysAgo] });
      if (paymentMethod) expect(draft.paymentMethod).toBe(paymentMethod);
      expect(draft.status).toBe(
        amountMinor !== null && categoryKey !== null ? 'complete' : 'incomplete',
      );
      expect(draft.recognizedText).toBe(text.trim());
      expect(draft.language).toBe(language);
    },
  );
}

describe('parseVoiceExpense — English fixtures', () => runSuite('en', ENGLISH));
describe('parseVoiceExpense — Bengali fixtures', () => runSuite('bn', BENGALI));
describe('parseVoiceExpense — Hindi fixtures', () => runSuite('hi', HINDI));
