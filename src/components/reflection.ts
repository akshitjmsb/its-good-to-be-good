/**
 * Curated multilingual quote pool. The first paint reads from this pool
 * synchronously — no API calls, no loading state. Selection is deterministic
 * per local date (same quote for the whole day), and a module-level cache
 * preserves the chosen quote across in-session navigations (todo.html etc.)
 * without touching localStorage.
 *
 * Bias: Urdu (~65 %), then Hindi, Punjabi, Persian (Rumi/Hafez/Saadi),
 * and English (Stoic + Gibran + Neruda).
 *
 * Source attributions follow the canonical anthologies. When a couplet is
 * universally quoted but the named ghazal/poem isn't reliably identifiable
 * (most Mir/Jaun couplets fall in this bucket), `source` is left undefined.
 */

export interface MultilingualQuote {
  quote: string;
  author: string;
  language: 'en' | 'hi' | 'ur' | 'pa' | 'fa';
  transliteration?: string;
  translation?: string;
  source?: string;
}

const QUOTES: ReadonlyArray<MultilingualQuote> = [
  // ── Mirza Ghalib (Diwan-e-Ghalib) ────────────────────────────────────────
  {
    quote: 'ہزاروں خواہشیں ایسی کہ ہر خواہش پہ دم نکلے\nبہت نکلے میرے ارمان لیکن پھر بھی کم نکلے',
    author: 'Mirza Ghalib',
    language: 'ur',
    transliteration: 'Hazaaron khwahishein aisi ke har khwahish pe dam nikle\nBahut nikle mere armaan lekin phir bhi kam nikle',
    translation: 'A thousand desires, each worth dying for; many of mine were fulfilled, yet many remain.',
    source: 'Diwan-e-Ghalib',
  },
  {
    quote: 'دلِ ناداں تجھے ہوا کیا ہے\nآخر اس درد کی دوا کیا ہے',
    author: 'Mirza Ghalib',
    language: 'ur',
    transliteration: 'Dil-e-naadan tujhe hua kya hai\nAakhir is dard ki dawa kya hai',
    translation: 'Innocent heart, what has happened to you? At last, what is the cure for this pain?',
    source: 'Diwan-e-Ghalib',
  },
  {
    quote: 'ہم کو معلوم ہے جنّت کی حقیقت لیکن\nدل کے خوش رکھنے کو غالبؔ یہ خیال اچھا ہے',
    author: 'Mirza Ghalib',
    language: 'ur',
    transliteration: 'Hum ko maaloom hai jannat ki haqeeqat lekin\nDil ke khush rakhne ko Ghalib ye khayal achha hai',
    translation: 'We know the reality of paradise — yet to keep the heart content, Ghalib, this thought is good enough.',
    source: 'Diwan-e-Ghalib',
  },
  {
    quote: 'موت کا اِک دن مُعیّن ہے\nنیند کیوں رات بھر نہیں آتی',
    author: 'Mirza Ghalib',
    language: 'ur',
    transliteration: 'Maut ka ek din mu’ayyan hai\nNeend kyun raat bhar nahi aati',
    translation: 'The day of death is already fixed — why then does sleep not come all night?',
    source: 'Diwan-e-Ghalib',
  },
  {
    quote: 'بے خودی بے سبب نہیں غالبؔ\nکچھ تو ہے جس کی پردہ داری ہے',
    author: 'Mirza Ghalib',
    language: 'ur',
    transliteration: 'Bekhudi besabab nahi Ghalib\nKuchh to hai jis ki pardadari hai',
    translation: 'This self-loss is not without cause, Ghalib — something is being concealed.',
    source: 'Diwan-e-Ghalib',
  },
  {
    quote: 'عشق نے غالبؔ نکمّا کر دیا\nورنہ ہم بھی آدمی تھے کام کے',
    author: 'Mirza Ghalib',
    language: 'ur',
    transliteration: 'Ishq ne Ghalib nikamma kar diya\nWarna hum bhi aadmi the kaam ke',
    translation: 'Love has rendered Ghalib useless — otherwise, I too was a man of substance.',
    source: 'Diwan-e-Ghalib',
  },
  {
    quote: 'رنج سے خوگر ہوا انساں تو مٹ جاتا ہے رنج\nمشکلیں مجھ پر پڑیں اتنی کہ آساں ہو گئیں',
    author: 'Mirza Ghalib',
    language: 'ur',
    transliteration: 'Ranj se khoogar hua insaan to mit jaata hai ranj\nMushkilein mujh par padin itni ke aasaan ho gayin',
    translation: 'When a person grows accustomed to grief, the grief itself dissolves; so many troubles fell on me that they became easy.',
    source: 'Diwan-e-Ghalib',
  },
  {
    quote: 'ہوئی مدّت کہ غالبؔ مر گیا پر یاد آتا ہے\nوہ ہر اِک بات پہ کہنا کہ یوں ہوتا تو کیا ہوتا',
    author: 'Mirza Ghalib',
    language: 'ur',
    transliteration: 'Hui muddat ke Ghalib mar gaya par yaad aata hai\nWoh har ik baat pe kehna ke yun hota to kya hota',
    translation: 'Long has it been since Ghalib died — yet I remember how he said, of every little thing: "what if it had been so?"',
    source: 'Diwan-e-Ghalib',
  },
  {
    quote: 'نہ تھا کچھ تو خدا تھا، کچھ نہ ہوتا تو خدا ہوتا\nڈبویا مجھ کو ہونے نے، نہ ہوتا میں تو کیا ہوتا',
    author: 'Mirza Ghalib',
    language: 'ur',
    transliteration: 'Na tha kuchh to Khuda tha, kuchh na hota to Khuda hota\nDuboya mujh ko hone ne, na hota main to kya hota',
    translation: 'When nothing was, God was; if nothing were, God would still be. My very being drowned me — had I not been, what would I be?',
    source: 'Diwan-e-Ghalib',
  },
  {
    quote: 'بازیچۂ اطفال ہے دنیا میرے آگے\nہوتا ہے شب و روز تماشا میرے آگے',
    author: 'Mirza Ghalib',
    language: 'ur',
    transliteration: 'Baazicha-e-atfaal hai duniya mere aage\nHota hai shab-o-roz tamasha mere aage',
    translation: 'The world is a child’s playground before me — night and day, a spectacle unfolds.',
    source: 'Diwan-e-Ghalib',
  },
  {
    quote: 'بسکہ دشوار ہے ہر کام کا آساں ہونا\nآدمی کو بھی میسّر نہیں انساں ہونا',
    author: 'Mirza Ghalib',
    language: 'ur',
    transliteration: 'Baski dushwaar hai har kaam ka aasaan hona\nAadmi ko bhi mayassar nahi insaan hona',
    translation: 'So hard is it for any task to come easy — even being human is not granted to a man.',
    source: 'Diwan-e-Ghalib',
  },
  {
    quote: 'عشرتِ قطرہ ہے دریا میں فنا ہو جانا\nدرد کا حد سے گزرنا ہے دوا ہو جانا',
    author: 'Mirza Ghalib',
    language: 'ur',
    transliteration: 'Ishrat-e-qatra hai darya mein fanaa ho jaana\nDard ka hadd se guzarna hai dawa ho jaana',
    translation: 'A drop’s ecstasy is to vanish into the sea; pain crossing its limit becomes its own remedy.',
    source: 'Diwan-e-Ghalib',
  },
  {
    quote: 'آہ کو چاہیے اِک عمر اثر ہونے تک\nکون جیتا ہے تری زلف کے سر ہونے تک',
    author: 'Mirza Ghalib',
    language: 'ur',
    transliteration: 'Aah ko chahiye ik umr asar hone tak\nKaun jeeta hai teri zulf ke sar hone tak',
    translation: 'A sigh needs a lifetime to take effect — who lives long enough to win your tresses?',
    source: 'Diwan-e-Ghalib',
  },
  {
    quote: 'دل ہی تو ہے نہ سنگ و خشت، درد سے بھر نہ آئے کیوں\nروئیں گے ہم ہزار بار، کوئی ہمیں ستائے کیوں',
    author: 'Mirza Ghalib',
    language: 'ur',
    transliteration: 'Dil hi to hai na sang-o-khisht, dard se bhar na aaye kyun\nRoyenge hum hazaar baar, koi hamein sataaye kyun',
    translation: 'It is only a heart, not stone or brick — why would it not fill with pain? We shall weep a thousand times — why must anyone torment us?',
    source: 'Diwan-e-Ghalib',
  },
  {
    quote: 'یہ نہ تھی ہماری قسمت کہ وصالِ یار ہوتا\nاگر اور جیتے رہتے، یہی انتظار ہوتا',
    author: 'Mirza Ghalib',
    language: 'ur',
    transliteration: 'Ye na thi hamaari qismat ke wisaal-e-yaar hota\nAgar aur jeete rehte, yahi intezaar hota',
    translation: 'It was not in our fate to be united with the beloved — had we lived longer, this very waiting would have continued.',
    source: 'Diwan-e-Ghalib',
  },
  {
    quote: 'حضرتِ ناصح! گر آئیں دیدہ و دل فرشِ راہ\nکوئی مجھ کو یہ تو سمجھا دے کہ سمجھاؤں اسے کیا',
    author: 'Mirza Ghalib',
    language: 'ur',
    transliteration: 'Hazrat-e-Naasih! gar aayein deeda-o-dil farsh-e-raah\nKoi mujh ko ye to samjha de ke samjhaaon use kya',
    translation: 'O preacher, even if you come with eye and heart spread for the road — let someone first explain to me what I am to explain to him.',
    source: 'Diwan-e-Ghalib',
  },
  {
    quote: 'غم اگرچہ جاں گسل ہے، پہ کہاں بچیں کہ دل ہے\nغمِ عشق گر نہ ہوتا، غمِ روزگار ہوتا',
    author: 'Mirza Ghalib',
    language: 'ur',
    transliteration: 'Gham agarche jaan-gusil hai, pe kahaan bachen ke dil hai\nGham-e-ishq gar na hota, gham-e-rozgaar hota',
    translation: 'Grief, though life-shattering — where to flee, when the heart is here? If not the grief of love, it would be the grief of livelihood.',
    source: 'Diwan-e-Ghalib',
  },

  // ── Mir Taqi Mir (Kulliyat-e-Mir) ─────────────────────────────────────────
  {
    quote: 'پتّا پتّا بُوٹا بُوٹا حال ہمارا جانے ہے\nجانے نہ جانے گُل ہی نہ جانے، باغ تو سارا جانے ہے',
    author: 'Mir Taqi Mir',
    language: 'ur',
    transliteration: 'Patta patta boota boota haal hamaara jaane hai\nJaane na jaane gul hi na jaane, baagh to saara jaane hai',
    translation: 'Every leaf, every plant knows my condition — whether the rose knows or not, the whole garden knows.',
    source: 'Kulliyat-e-Mir',
  },
  {
    quote: 'ابتدائے عشق ہے روتا ہے کیا\nآگے آگے دیکھیے ہوتا ہے کیا',
    author: 'Mir Taqi Mir',
    language: 'ur',
    transliteration: 'Ibtida-e-ishq hai rota hai kya\nAage aage dekhiye hota hai kya',
    translation: 'This is only love’s beginning — why already weep? Wait and watch what is yet to come.',
    source: 'Kulliyat-e-Mir',
  },
  {
    quote: 'میرؔ کیا سادہ ہیں، بیمار ہوئے جس کے سبب\nاُسی عطّار کے لونڈے سے دوا لیتے ہیں',
    author: 'Mir Taqi Mir',
    language: 'ur',
    transliteration: 'Mir kya saade hain, beemaar hue jis ke sabab\nUsi attaar ke launde se dawa lete hain',
    translation: 'How innocent Mir is — the very one who made him ill, from that perfumer’s lad he begs his cure.',
    source: 'Kulliyat-e-Mir',
  },
  {
    quote: 'ہستی اپنی حباب کی سی ہے\nیہ نمائش سراب کی سی ہے',
    author: 'Mir Taqi Mir',
    language: 'ur',
    transliteration: 'Hasti apni habab ki si hai\nYeh numaaish saraab ki si hai',
    translation: 'My existence is like a bubble; this whole show is like a mirage.',
    source: 'Kulliyat-e-Mir',
  },
  {
    quote: 'دیکھ تو دل کہ جاں سے اٹھتا ہے\nیہ دھواں سا کہاں سے اٹھتا ہے',
    author: 'Mir Taqi Mir',
    language: 'ur',
    transliteration: 'Dekh to dil ke jaan se uthta hai\nYeh dhuaan sa kahaan se uthta hai',
    translation: 'Look — does it rise from the heart, or from the soul? Where does this smoke arise from?',
    source: 'Kulliyat-e-Mir',
  },
  {
    quote: 'اُلٹی ہو گئیں سب تدبیریں کچھ نہ دوا نے کام کیا\nدیکھا اس بیماریِ دل نے آخر کام تمام کیا',
    author: 'Mir Taqi Mir',
    language: 'ur',
    transliteration: 'Ulti ho gayin sab tadbeerein kuchh na dawa ne kaam kiya\nDekha is beemaari-e-dil ne aakhir kaam tamaam kiya',
    translation: 'Every plan went awry, no medicine availed — see how this heart-sickness, in the end, finished me off.',
    source: 'Kulliyat-e-Mir',
  },
  {
    quote: 'نازکی اس کے لب کی کیا کہئے\nپنکھڑی اِک گلاب کی سی ہے',
    author: 'Mir Taqi Mir',
    language: 'ur',
    transliteration: 'Naazuki us ke lab ki kya kahiye\nPankhdi ik gulab ki si hai',
    translation: 'How shall I describe the delicacy of her lips? They are like the petal of a single rose.',
    source: 'Kulliyat-e-Mir',
  },
  {
    quote: 'شام ہی سے بجھا سا رہتا ہے\nدل ہوا ہے چراغ مفلس کا',
    author: 'Mir Taqi Mir',
    language: 'ur',
    transliteration: 'Shaam hi se bujha sa rehta hai\nDil hua hai chiraagh muflis ka',
    translation: 'From dusk onward it stays half-extinguished — my heart has become a beggar’s lamp.',
    source: 'Kulliyat-e-Mir',
  },

  // ── Allama Iqbal ─────────────────────────────────────────────────────────
  {
    quote: 'خودی کو کر بلند اتنا کہ ہر تقدیر سے پہلے\nخدا بندے سے خود پوچھے، بتا تیری رضا کیا ہے',
    author: 'Allama Iqbal',
    language: 'ur',
    transliteration: 'Khudi ko kar buland itna ke har taqdeer se pehle\nKhuda bande se khud poochhe, bata teri raza kya hai',
    translation: 'Raise your selfhood so high that, before every fate, God Himself asks His servant: tell me, what is your will?',
    source: 'Bal-e-Jibril',
  },
  {
    quote: 'ستاروں سے آگے جہاں اور بھی ہیں\nابھی عشق کے امتحاں اور بھی ہیں',
    author: 'Allama Iqbal',
    language: 'ur',
    transliteration: 'Sitaaron se aage jahaan aur bhi hain\nAbhi ishq ke imtihaan aur bhi hain',
    translation: 'Beyond the stars there are worlds yet more — many trials of love still remain.',
    source: 'Bal-e-Jibril',
  },
  {
    quote: 'تو شاہیں ہے، پرواز ہے کام تیرا\nتیرے سامنے آسماں اور بھی ہیں',
    author: 'Allama Iqbal',
    language: 'ur',
    transliteration: 'Tu shaheen hai, parwaaz hai kaam tera\nTere saamne aasmaan aur bhi hain',
    translation: 'You are a falcon — flight is your calling. Before you lie skies yet greater.',
    source: 'Bal-e-Jibril',
  },
  {
    quote: 'نہیں تیرا نشیمن قصرِ سلطانی کے گنبد پر\nتو شاہیں ہے، بسیرا کر پہاڑوں کی چٹانوں پر',
    author: 'Allama Iqbal',
    language: 'ur',
    transliteration: 'Nahi tera nasheman qasr-e-sultani ke gumbad par\nTu shaheen hai, basera kar pahaaron ki chataanon par',
    translation: 'Your nest is not on the dome of the king’s palace — you are a falcon; make your home on the crags of mountains.',
    source: 'Bal-e-Jibril',
  },
  {
    quote: 'اپنے من میں ڈوب کر پا جا سراغِ زندگی\nتو اگر میرا نہیں بنتا، نہ بن، اپنا تو بن',
    author: 'Allama Iqbal',
    language: 'ur',
    transliteration: 'Apne man mein doob kar paa ja suraagh-e-zindagi\nTu agar mera nahi banta, na ban, apna to ban',
    translation: 'Plunge into your own self and find life’s trace; if you will not be mine, then at least be your own.',
    source: 'Bal-e-Jibril',
  },
  {
    quote: 'اے طائرِ لاہوتی! اس رزق سے موت اچھی\nجس رزق سے آتی ہو پرواز میں کوتاہی',
    author: 'Allama Iqbal',
    language: 'ur',
    transliteration: 'Ae taa’ir-e-laahooti! is rizq se maut achhi\nJis rizq se aati ho parwaaz mein kotaahi',
    translation: 'O divine bird, death is better than that sustenance which shortens your flight.',
    source: 'Bal-e-Jibril',
  },
  {
    quote: 'ڈھونڈنے والا ستاروں کی گزر گاہوں کا\nاپنے افکار کی دنیا میں سفر کر نہ سکا',
    author: 'Allama Iqbal',
    language: 'ur',
    transliteration: 'Dhoondne wala sitaaron ki guzargaahon ka\nApne afkaar ki duniya mein safar kar na saka',
    translation: 'The seeker of the highways of stars could not journey into the world of his own thoughts.',
    source: 'Zarb-e-Kalim',
  },
  {
    quote: 'محبت مجھے ان جوانوں سے ہے\nستاروں پہ جو ڈالتے ہیں کمند',
    author: 'Allama Iqbal',
    language: 'ur',
    transliteration: 'Mohabbat mujhe un jawaanon se hai\nSitaaron pe jo daalte hain kamand',
    translation: 'My love is for those young men who cast their lassoes at the stars.',
    source: 'Bal-e-Jibril',
  },
  {
    quote: 'خدا تجھے کسی طوفاں سے آشنا کر دے\nکہ تیرے بحر کی موجوں میں اضطراب نہیں',
    author: 'Allama Iqbal',
    language: 'ur',
    transliteration: 'Khuda tujhe kisi toofaan se aashna kar de\nKe tere bahr ki maujon mein iztiraab nahi',
    translation: 'May God acquaint you with some storm — for the waves of your sea contain no restlessness.',
    source: 'Bal-e-Jibril',
  },
  {
    quote: 'غلامی میں نہ کام آتی ہیں شمشیریں نہ تدبیریں\nجو ہو ذوقِ یقیں پیدا تو کٹ جاتی ہیں زنجیریں',
    author: 'Allama Iqbal',
    language: 'ur',
    transliteration: 'Ghulami mein na kaam aati hain shamsheerein na tadbeerein\nJo ho zauq-e-yaqeen paida to kat jaati hain zanjeerein',
    translation: 'In bondage neither swords nor strategies avail — once a taste for certainty is born, the chains break of themselves.',
    source: 'Bal-e-Jibril',
  },
  {
    quote: 'کبھی اے حقیقتِ منتظر! نظر آ لباسِ مجاز میں\nکہ ہزاروں سجدے تڑپ رہے ہیں مری جبینِ نیاز میں',
    author: 'Allama Iqbal',
    language: 'ur',
    transliteration: 'Kabhi ae haqeeqat-e-muntazar! nazar aa libaas-e-majaaz mein\nKe hazaaron sajde tadap rahe hain meri jabeen-e-niyaaz mein',
    translation: 'O awaited Reality, appear once in the garb of metaphor — a thousand prostrations writhe upon my brow of supplication.',
    source: 'Bal-e-Jibril',
  },
  {
    quote: 'خرد نے کہہ بھی دیا "لا الٰہ" تو کیا حاصل\nدل و نگاہ مسلماں نہیں تو کچھ بھی نہیں',
    author: 'Allama Iqbal',
    language: 'ur',
    transliteration: 'Khirad ne keh bhi diya "la ilaaha" to kya haasil\nDil-o-nigaah Musalmaan nahi to kuchh bhi nahi',
    translation: 'Even if the intellect declares "there is no god" — what use, if heart and gaze are not those of a believer?',
    source: 'Bal-e-Jibril',
  },
  {
    quote: 'اقبالؔ بڑا اپدیشک ہے، من باتوں میں موہ لیتا ہے\nگفتار کا یہ غازی تو بنا، کردار کا غازی بن نہ سکا',
    author: 'Allama Iqbal',
    language: 'ur',
    transliteration: 'Iqbal bada updeshak hai, man baaton mein moh leta hai\nGuftaar ka ye ghazi to bana, kirdaar ka ghazi ban na saka',
    translation: 'Iqbal is a great preacher — he charms the heart with words. He became a champion of speech, but could not become a champion of conduct.',
    source: 'Bal-e-Jibril',
  },
  {
    quote: 'نہیں ہے ناامید اقبالؔ اپنی کشتِ ویراں سے\nذرا نم ہو تو یہ مٹی بڑی زرخیز ہے ساقی',
    author: 'Allama Iqbal',
    language: 'ur',
    transliteration: 'Nahi hai naumeed Iqbal apni kisht-e-veeraan se\nZara nam ho to ye mitti badi zarkhez hai saaqi',
    translation: 'Iqbal does not despair of his barren field — give it a little moisture, O cup-bearer, and this soil is very fertile.',
    source: 'Bal-e-Jibril',
  },
  {
    quote: 'نگاہِ بلند، سخن دلنواز، جاں پُرسوز\nیہی ہے رختِ سفر میرِ کارواں کے لیے',
    author: 'Allama Iqbal',
    language: 'ur',
    transliteration: 'Nigaah-e-buland, sukhan dilnawaaz, jaan pursoz\nYahi hai rakht-e-safar Meer-e-Karwaan ke liye',
    translation: 'A lofty gaze, heart-winning speech, a soul aflame — these are the travel-gear of the caravan’s leader.',
    source: 'Bal-e-Jibril',
  },

  // ── Faiz Ahmed Faiz ──────────────────────────────────────────────────────
  {
    quote: 'بول کہ لب آزاد ہیں تیرے\nبول، زباں اب تک تیری ہے',
    author: 'Faiz Ahmed Faiz',
    language: 'ur',
    transliteration: 'Bol ke lab azad hain tere\nBol, zubaan ab tak teri hai',
    translation: 'Speak, for your lips are free; speak, your tongue is still your own.',
    source: 'Bol (Naqsh-e-Faryadi)',
  },
  {
    quote: 'ہم دیکھیں گے\nلازم ہے کہ ہم بھی دیکھیں گے\nوہ دن کہ جس کا وعدہ ہے',
    author: 'Faiz Ahmed Faiz',
    language: 'ur',
    transliteration: 'Hum dekhenge\nLazim hai ke hum bhi dekhenge\nWoh din ke jis ka waada hai',
    translation: 'We shall witness — it is certain that we too shall witness that day which has been promised.',
    source: 'Hum Dekhenge',
  },
  {
    quote: 'مجھ سے پہلی سی محبت میرے محبوب نہ مانگ\nمیں نے سمجھا تھا کہ تو ہے تو درخشاں ہے حیات',
    author: 'Faiz Ahmed Faiz',
    language: 'ur',
    transliteration: 'Mujh se pehli si mohabbat mere mehboob na maang\nMaine samjha tha ke tu hai to darakhshaan hai hayaat',
    translation: 'Do not ask of me, my love, the love I once gave you. I had thought: if you exist, life is radiance.',
    source: 'Naqsh-e-Faryadi',
  },
  {
    quote: 'یہ داغ داغ اُجالا، یہ شب گزیدہ سحر\nوہ انتظار تھا جس کا، یہ وہ سحر تو نہیں',
    author: 'Faiz Ahmed Faiz',
    language: 'ur',
    transliteration: 'Yeh daagh daagh ujala, yeh shab-gazida sahar\nWoh intezaar tha jis ka, yeh woh sahar to nahi',
    translation: 'This stained light, this night-bitten dawn — this is not the morning we had awaited.',
    source: 'Subh-e-Azadi (Dast-e-Saba)',
  },
  {
    quote: 'گلوں میں رنگ بھرے، بادِ نوبہار چلے\nچلے بھی آؤ کہ گلشن کا کاروبار چلے',
    author: 'Faiz Ahmed Faiz',
    language: 'ur',
    transliteration: 'Gulon mein rang bhare, baad-e-naubahaar chale\nChale bhi aao ke gulshan ka kaarobaar chale',
    translation: 'Let colour fill the flowers; let the new spring breeze blow — come, then, so the garden’s business may resume.',
    source: 'Dast-e-Tah-e-Sang',
  },
  {
    quote: 'آئیے ہاتھ اٹھائیں ہم بھی\nہم جنہیں رسمِ دعا یاد نہیں',
    author: 'Faiz Ahmed Faiz',
    language: 'ur',
    transliteration: 'Aaiye haath uthaayein hum bhi\nHum jinhein rasm-e-dua yaad nahi',
    translation: 'Come, let us too raise our hands in prayer — we, who no longer remember the rites of supplication.',
    source: 'Dast-e-Saba',
  },
  {
    quote: 'دل نہ امّید تو نہیں، ناکام ہی تو ہے\nلمبی ہے غم کی شام، مگر شام ہی تو ہے',
    author: 'Faiz Ahmed Faiz',
    language: 'ur',
    transliteration: 'Dil na umeed to nahi, naakaam hi to hai\nLambi hai gham ki shaam, magar shaam hi to hai',
    translation: 'The heart is not without hope — only unfulfilled. The evening of grief is long — but it is, after all, only an evening.',
    source: 'Dast-e-Saba',
  },
  {
    quote: 'مقامِ فیضؔ کوئی راہ میں جچا ہی نہیں\nجو کوئے یار سے نکلے تو سوئے دار چلے',
    author: 'Faiz Ahmed Faiz',
    language: 'ur',
    transliteration: 'Maqaam-e-Faiz koi raah mein jacha hi nahi\nJo koo-e-yaar se nikle to soo-e-daar chale',
    translation: 'No station on the way pleased Faiz — leaving the beloved’s street, he set out straight for the gallows.',
  },
  {
    quote: 'نثار میں تری گلیوں کے اے وطن، کہ جہاں\nچلی ہے رسم کہ کوئی نہ سر اٹھا کے چلے',
    author: 'Faiz Ahmed Faiz',
    language: 'ur',
    transliteration: 'Nisaar main teri galiyon ke ae watan, ke jahaan\nChali hai rasm ke koi na sar utha ke chale',
    translation: 'I lay myself down for your alleys, O homeland — where the custom is that no one walks with head held high.',
    source: 'Dast-e-Saba',
  },
  {
    quote: 'رات یوں دل میں تری کھوئی ہوئی یاد آئی\nجیسے ویرانے میں چپکے سے بہار آ جائے',
    author: 'Faiz Ahmed Faiz',
    language: 'ur',
    transliteration: 'Raat yun dil mein teri khoyi hui yaad aayi\nJaise veerane mein chupke se bahaar aa jaaye',
    translation: 'Tonight your lost memory came to my heart as if, in a wasteland, spring arrived in silence.',
    source: 'Naqsh-e-Faryadi',
  },
  {
    quote: 'وہ بات سارے فسانے میں جس کا ذکر نہ تھا\nوہ بات اُن کو بہت ناگوار گزری ہے',
    author: 'Faiz Ahmed Faiz',
    language: 'ur',
    transliteration: 'Woh baat saare fasaane mein jis ka zikr na tha\nWoh baat un ko bahut naagawaar guzri hai',
    translation: 'That one thing — the very thing the whole tale never mentioned — that is what they found most unbearable.',
    source: 'Sar-e-Wadi-e-Seena',
  },
  {
    quote: 'ہم پرورشِ لوحِ قلم کرتے رہیں گے\nجو دل پہ گزرتی ہے رقم کرتے رہیں گے',
    author: 'Faiz Ahmed Faiz',
    language: 'ur',
    transliteration: 'Hum parwarish-e-lauh-o-qalam karte rahenge\nJo dil pe guzarti hai raqam karte rahenge',
    translation: 'We will keep nurturing tablet and pen — whatever passes over the heart, we will keep writing down.',
  },

  // ── Jaun Elia ────────────────────────────────────────────────────────────
  {
    quote: 'ہم رہے بھی تو کیا رہے یارو\nیعنی اپنا ہی نام رہنے دیا',
    author: 'Jaun Elia',
    language: 'ur',
    transliteration: 'Hum rahe bhi to kya rahe yaaro\nYa’ni apna hi naam rehne diya',
    translation: 'And what kind of remaining was ours, friends — we left behind only our name.',
  },
  {
    quote: 'اب نہیں کوئی بات خطرے کی\nاب سبھی کو سبھی سے خطرہ ہے',
    author: 'Jaun Elia',
    language: 'ur',
    transliteration: 'Ab nahi koi baat khatre ki\nAb sabhi ko sabhi se khatra hai',
    translation: 'Nothing dangerous remains to be said — now everyone is a danger to everyone.',
  },
  {
    quote: 'میں بھی بہت عجیب ہوں اتنا عجیب ہوں کہ بس\nخود کو تباہ کر لیا اور ملال بھی نہیں',
    author: 'Jaun Elia',
    language: 'ur',
    transliteration: 'Main bhi bahut ajeeb hoon itna ajeeb hoon ke bas\nKhud ko tabaah kar liya aur malaal bhi nahi',
    translation: 'I too am strange — so strange that I ruined myself, and don’t even regret it.',
  },
  {
    quote: 'اب تو ہر وقت یہی ہوتا ہے\nکچھ نہیں ہوتا تو کیا ہوتا ہے',
    author: 'Jaun Elia',
    language: 'ur',
    transliteration: 'Ab to har waqt yahi hota hai\nKuchh nahi hota to kya hota hai',
    translation: 'Now this is all that happens at every moment: nothing happens — and what is that, if not something?',
  },
  {
    quote: 'ایک ہی حادثہ تو ہے اور وہ یہ\nآج تک بات ہی نہیں ہوئی',
    author: 'Jaun Elia',
    language: 'ur',
    transliteration: 'Ek hi haadsa to hai aur woh ye\nAaj tak baat hi nahi hui',
    translation: 'There is only one disaster, and it is this: to this day, we have never spoken.',
  },
  {
    quote: 'جو گزاری نہ جا سکی ہم سے\nہم نے وہ زندگی گزاری ہے',
    author: 'Jaun Elia',
    language: 'ur',
    transliteration: 'Jo guzaari na ja saki hum se\nHum ne woh zindagi guzaari hai',
    translation: 'The life that could not be lived — that is the life I have lived.',
  },

  // ── Ahmed Faraz ──────────────────────────────────────────────────────────
  {
    quote: 'اب کے ہم بچھڑے تو شاید کبھی خوابوں میں ملیں\nجس طرح سوکھے ہوئے پھول کتابوں میں ملیں',
    author: 'Ahmed Faraz',
    language: 'ur',
    transliteration: 'Ab ke hum bichhde to shaayad kabhi khwaabon mein milein\nJis tarah sookhe hue phool kitaabon mein milein',
    translation: 'If we part now, perhaps we will meet only in dreams — the way dried flowers are found in old books.',
  },
  {
    quote: 'سنا ہے لوگ اسے آنکھ بھر کے دیکھتے ہیں\nسو اس کے شہر میں کچھ دن ٹھہر کے دیکھتے ہیں',
    author: 'Ahmed Faraz',
    language: 'ur',
    transliteration: 'Suna hai log use aankh bhar ke dekhte hain\nSo us ke shehr mein kuchh din thehar ke dekhte hain',
    translation: 'I’ve heard they look at her with eyes filled to the brim — so let me linger a few days in her city, and see.',
  },
  {
    quote: 'زندگی سے یہی گلہ ہے مجھے\nتو بہت دیر سے ملا ہے مجھے',
    author: 'Ahmed Faraz',
    language: 'ur',
    transliteration: 'Zindagi se yahi gila hai mujhe\nTu bahut der se mila hai mujhe',
    translation: 'This is my one complaint with life: that you came to me too late.',
  },
  {
    quote: 'رنجش ہی سہی، دل ہی دکھانے کے لیے آ\nآ پھر سے مجھے چھوڑ کے جانے کے لیے آ',
    author: 'Ahmed Faraz',
    language: 'ur',
    transliteration: 'Ranjish hi sahi, dil hi dukhaane ke liye aa\nAa phir se mujhe chhod ke jaane ke liye aa',
    translation: 'Let it even be quarrel — come at least to wound the heart; come once more, if only to leave me again.',
  },
  {
    quote: 'یہ کیا کہ سب سے بیاں دلِ حال ہم نے کیا\nجو غم خاص تھا اس کو بھی عام ہم نے کیا',
    author: 'Ahmed Faraz',
    language: 'ur',
    transliteration: 'Ye kya ke sab se bayaan-e-dil-e-haal hum ne kiya\nJo gham khaas tha us ko bhi aam hum ne kiya',
    translation: 'What kind of folly was this — to tell my heart’s state to all? The grief that was private, I made common.',
  },
  {
    quote: 'شکوہ ظلمتِ شب سے تو کہیں بہتر تھا\nاپنے حصے کی کوئی شمع جلاتے جاتے',
    author: 'Ahmed Faraz',
    language: 'ur',
    transliteration: 'Shikwa zulmat-e-shab se to kaheen behtar tha\nApne hisse ki koi shama jalaate jaate',
    translation: 'Far better than complaining of the night’s darkness — to have lit, in passing, the small lamp that was your share.',
  },
  {
    quote: 'اب کے تجدیدِ وفا کا نہیں امکاں جاناں\nیاد کیا تجھ کو دلائیں ترا پیماں جاناں',
    author: 'Ahmed Faraz',
    language: 'ur',
    transliteration: 'Ab ke tajdeed-e-wafa ka nahi imkaan jaanaan\nYaad kya tujh ko dilaayein tera paimaan jaanaan',
    translation: 'There is no chance, this time, of renewing the vow, beloved — what use to remind you of your promise?',
  },

  // ── Parveen Shakir ───────────────────────────────────────────────────────
  {
    quote: 'وہ تو خوشبو ہے، ہواؤں میں بکھر جائے گا\nمسئلہ پھول کا ہے، پھول کدھر جائے گا',
    author: 'Parveen Shakir',
    language: 'ur',
    transliteration: 'Woh to khushboo hai, hawaaon mein bikhar jaayega\nMasla phool ka hai, phool kidhar jaayega',
    translation: 'He is fragrance — he will scatter in the winds; the trouble is the flower’s — where will the flower go?',
    source: 'Khushboo',
  },
  {
    quote: 'کیسے کہہ دوں کہ مجھے چھوڑ دیا ہے اس نے\nبات تو سچ ہے مگر بات ہے رسوائی کی',
    author: 'Parveen Shakir',
    language: 'ur',
    transliteration: 'Kaise keh doon ke mujhe chhod diya hai us ne\nBaat to sach hai magar baat hai ruswaai ki',
    translation: 'How can I say that he has left me? It is true — but it is a thing of disgrace.',
    source: 'Khushboo',
  },
  {
    quote: 'میں سچ کہوں گی، مگر پھر بھی ہار جاؤں گی\nوہ جھوٹ بولے گا اور لاجواب کر دے گا',
    author: 'Parveen Shakir',
    language: 'ur',
    transliteration: 'Main sach kahoongi, magar phir bhi haar jaaungi\nWoh jhoot bolega aur laajawaab kar dega',
    translation: 'I shall speak the truth — and still, I will lose. He will lie, and leave me with no reply.',
    source: 'Khushboo',
  },
  {
    quote: 'وہ کہیں بھی گیا، لوٹا تو میرے پاس آیا\nبس یہی بات ہے اچھی میرے ہرجائی کی',
    author: 'Parveen Shakir',
    language: 'ur',
    transliteration: 'Woh kaheen bhi gaya, lauta to mere paas aaya\nBas yahi baat hai achhi mere harjaai ki',
    translation: 'Wherever he went, when he returned, he came to me — that, alone, is the redeeming thing about my faithless one.',
    source: 'Khushboo',
  },
  {
    quote: 'اس نے جلتی ہوئی پیشانی پہ جب ہاتھ رکھا\nروح تک آ گئی تاثیرِ مسیحائی کی',
    author: 'Parveen Shakir',
    language: 'ur',
    transliteration: 'Us ne jalti hui peshaani pe jab haath rakha\nRooh tak aa gayi taaseer-e-maseehaayi ki',
    translation: 'When he placed his hand upon my burning brow, the healing of a messiah reached down even into my soul.',
    source: 'Khushboo',
  },

  // ── Sahir Ludhianvi ──────────────────────────────────────────────────────
  {
    quote: 'یہ محلوں، یہ تختوں، یہ تاجوں کی دنیا\nیہ انسان کے دشمن سماجوں کی دنیا',
    author: 'Sahir Ludhianvi',
    language: 'ur',
    transliteration: 'Yeh mehlon, yeh takhton, yeh taajon ki duniya\nYeh insaan ke dushman samaajon ki duniya',
    translation: 'This world of palaces, thrones, and crowns — this world of societies that are enemies of mankind.',
    source: 'Talkhiyaan',
  },
  {
    quote: 'تاج تیرے لیے اِک مظہرِ الفت ہی سہی\nتجھ کو اس وادیٔ رنگیں سے عقیدت ہی سہی\nمیرے محبوب کہیں اور ملا کر مجھ سے',
    author: 'Sahir Ludhianvi',
    language: 'ur',
    transliteration: 'Taj tere liye ik mazhar-e-ulfat hi sahi\nTujh ko is waadi-e-rangeen se aqeedat hi sahi\nMere mehboob kaheen aur mila kar mujh se',
    translation: 'For you, the Taj may be a symbol of love; for you, this colourful valley may hold devotion — but, my beloved, meet me somewhere else.',
    source: 'Taj Mahal (Talkhiyaan)',
  },
  {
    quote: 'چلو اک بار پھر سے، اجنبی بن جائیں ہم دونوں',
    author: 'Sahir Ludhianvi',
    language: 'ur',
    transliteration: 'Chalo ik baar phir se, ajnabi ban jaayein hum donon',
    translation: 'Come, once more, let us become strangers to each other.',
    source: 'Talkhiyaan',
  },
  {
    quote: 'اور بھی غم ہیں زمانے میں محبت کے سوا\nراحتیں اور بھی ہیں وصل کی راحت کے سوا',
    author: 'Sahir Ludhianvi',
    language: 'ur',
    transliteration: 'Aur bhi gham hain zamaane mein mohabbat ke siwa\nRaahatein aur bhi hain wasl ki raahat ke siwa',
    translation: 'There are sorrows in the world other than love; there are pleasures other than the pleasure of union.',
    source: 'Talkhiyaan',
  },
  {
    quote: 'میں ہر اِک پل کا شاعر ہوں، ہر اِک پل میری کہانی ہے\nہر اِک پل میری ہستی ہے، ہر اِک پل میری جوانی ہے',
    author: 'Sahir Ludhianvi',
    language: 'ur',
    transliteration: 'Main har ik pal ka shaayar hoon, har ik pal meri kahaani hai\nHar ik pal meri hasti hai, har ik pal meri jawaani hai',
    translation: 'I am the poet of every moment — every moment my story; every moment my being; every moment my youth.',
    source: 'Kabhi Kabhie',
  },

  // ── Habib Jalib ──────────────────────────────────────────────────────────
  {
    quote: 'دیپ جس کا محلّات ہی میں جلے\nچند لوگوں کی خوشیوں کو لے کر چلے\nایسے دستور کو، صبحِ بے نور کو\nمیں نہیں مانتا، میں نہیں جانتا',
    author: 'Habib Jalib',
    language: 'ur',
    transliteration: 'Deep jis ka mahallaat hi mein jale\nChand logon ki khushiyon ko le kar chale\nAise dastoor ko, subh-e-be-noor ko\nMain nahi maanta, main nahi jaanta',
    translation: 'A lamp that burns only in palaces, that carries the joys of a few — such a constitution, such a lightless dawn, I do not accept, I do not know.',
    source: 'Dastoor',
  },
  {
    quote: 'میں بھی خائف نہیں تختۂ دار سے\nمیں بھی منصور ہوں، کہہ دو اغیار سے\nظلم کی بات کو، جہل کی رات کو\nمیں نہیں مانتا، میں نہیں جانتا',
    author: 'Habib Jalib',
    language: 'ur',
    transliteration: 'Main bhi khaaif nahi takhta-e-daar se\nMain bhi Mansoor hoon, keh do aghyaar se\nZulm ki baat ko, jahl ki raat ko\nMain nahi maanta, main nahi jaanta',
    translation: 'I, too, do not fear the gallows; I, too, am Mansoor — tell my opponents so. Tyranny’s talk, ignorance’s night — I do not accept, I do not know.',
    source: 'Dastoor',
  },
  {
    quote: 'محبت گولیوں سے بو رہے ہو\nوطن کا چہرہ خون سے دھو رہے ہو',
    author: 'Habib Jalib',
    language: 'ur',
    transliteration: 'Mohabbat goliyon se bo rahe ho\nWatan ka chehra khoon se dho rahe ho',
    translation: 'You are sowing love with bullets; you are washing the homeland’s face with blood.',
  },

  // ── Nasir Kazmi ──────────────────────────────────────────────────────────
  {
    quote: 'دل میں اِک لہر سی اٹھی ہے ابھی\nکوئی تازہ ہوا چلی ہے ابھی',
    author: 'Nasir Kazmi',
    language: 'ur',
    transliteration: 'Dil mein ik lehar si uthi hai abhi\nKoi taaza hawa chali hai abhi',
    translation: 'A wave has just risen in the heart; some fresh wind has just begun to blow.',
  },
  {
    quote: 'گئے دنوں کا سراغ لے کر کدھر سے آیا، کدھر گیا وہ',
    author: 'Nasir Kazmi',
    language: 'ur',
    transliteration: 'Gaye dinon ka suraagh le kar kidhar se aaya, kidhar gaya woh',
    translation: 'Bringing news of bygone days, where did he come from, and where did he go?',
  },

  // ── Wasi Shah ────────────────────────────────────────────────────────────
  {
    quote: 'محبتیں جب شمار میں آ جائیں\nدل کا بھرم ٹوٹ جاتا ہے',
    author: 'Wasi Shah',
    language: 'ur',
    transliteration: 'Mohabbatein jab shumaar mein aa jaayein\nDil ka bharam toot jaata hai',
    translation: 'Once love begins to be counted, the heart’s illusion shatters.',
  },

  // ── Ibn-e-Insha ──────────────────────────────────────────────────────────
  {
    quote: 'اِنشاؔ جی اٹھو، اب کوچ کرو، اِس شہر میں جی کا لگانا کیا',
    author: 'Ibn-e-Insha',
    language: 'ur',
    transliteration: 'Insha ji utho, ab kooch karo, is shehr mein ji ka lagaana kya',
    translation: 'Insha, rise — depart now. What is the use of giving your heart to this city?',
  },
  {
    quote: 'کل چودہویں کی رات تھی، شب بھر رہا چرچا تیرا\nکچھ نے کہا یہ چاند ہے، کچھ نے کہا چہرہ تیرا',
    author: 'Ibn-e-Insha',
    language: 'ur',
    transliteration: 'Kal chaudhveen ki raat thi, shab bhar raha charcha tera\nKuchh ne kaha yeh chaand hai, kuchh ne kaha chehra tera',
    translation: 'Last night was the fourteenth — all night long the talk was of you. Some said, "this is the moon"; some said, "this is your face."',
  },

  // ── Gulzar ───────────────────────────────────────────────────────────────
  {
    quote: 'آنکھوں کو ویزا نہیں لگتا، خوابوں کی سرحد ہوتی نہیں\nبند آنکھوں سے روز میں سرحد پار چلا جاتا ہوں',
    author: 'Gulzar',
    language: 'ur',
    transliteration: 'Aankhon ko visa nahi lagta, khwaabon ki sarhad hoti nahi\nBand aankhon se roz main sarhad paar chala jaata hoon',
    translation: 'Eyes need no visa; dreams have no border. With eyes shut, I cross the border every day.',
  },
  {
    quote: 'مجھ کو بھی ترکیب سکھا یار جلاہے\nاکثر تجھ کو دیکھا ہے کہ تانا بُنتے\nجب کوئی تاگا ٹوٹ گیا یا کھوٹ گیا\nجوڑ کے اور سرا کوئی، باندھ کے گٹھلی\nآگے بُننے لگتے ہو',
    author: 'Gulzar',
    language: 'ur',
    transliteration: 'Mujh ko bhi tarkeeb sikha yaar julaahe\nAksar tujh ko dekha hai ke taana bunte\nJab koi taaga toot gaya ya khot gaya\nJod ke aur sira koi, baandh ke gathli\nAage bunne lagte ho',
    translation: 'Teach me your method too, weaver friend — I have often watched you at the loom: when a thread breaks or runs short, you tie another end, knot it, and go on weaving.',
  },

  // ── Rahat Indori ─────────────────────────────────────────────────────────
  {
    quote: 'جو آج صاحبِ مسند ہیں، کل نہیں ہوں گے\nکرائے دار ہیں، ذاتی مکان تھوڑی ہے',
    author: 'Rahat Indori',
    language: 'ur',
    transliteration: 'Jo aaj saahib-e-masnad hain, kal nahi honge\nKiraayedaar hain, zaati makaan thodi hai',
    translation: 'Those seated on the throne today will not be there tomorrow — they are tenants, this is no private estate.',
  },
  {
    quote: 'اگر خلاف ہیں، ہونے دو، جان تھوڑی ہے\nیہ سب دھواں ہے، کوئی آسمان تھوڑی ہے',
    author: 'Rahat Indori',
    language: 'ur',
    transliteration: 'Agar khilaaf hain, hone do, jaan thodi hai\nYeh sab dhuaan hai, koi aasmaan thodi hai',
    translation: 'If they are against me — let them be; it is no matter of life. All this is smoke; it is hardly the sky.',
  },
  {
    quote: 'سبھی کا خون شامل ہے یہاں کی مٹی میں\nکسی کے باپ کا ہندوستان تھوڑی ہے',
    author: 'Rahat Indori',
    language: 'ur',
    transliteration: 'Sabhi ka khoon shaamil hai yahaan ki mitti mein\nKisi ke baap ka Hindustan thodi hai',
    translation: 'Everyone’s blood is mixed in this soil — Hindustan does not belong to anybody’s father.',
  },
  {
    quote: 'سرحدوں پر بہت تناؤ ہے کیا\nکچھ پتا تو کرو الیکشن ہے',
    author: 'Rahat Indori',
    language: 'ur',
    transliteration: 'Sarhadon par bahut tanaao hai kya\nKuchh pata to karo election hai',
    translation: 'Is there too much tension on the borders? Find out — perhaps an election is near.',
  },

  // ── Bashir Badr ──────────────────────────────────────────────────────────
  {
    quote: 'کوئی ہاتھ بھی نہ ملائے گا جو گلے ملو گے تپاک سے\nیہ نئے مزاج کا شہر ہے، ذرا فاصلے سے ملا کرو',
    author: 'Bashir Badr',
    language: 'ur',
    transliteration: 'Koi haath bhi na milaayega jo gale milo ge tapaak se\nYeh naye mizaaj ka shehr hai, zara faasle se mila karo',
    translation: 'No one will even shake your hand if you embrace too warmly — this is a city of new moods; meet at a slight distance.',
  },
  {
    quote: 'اجالا اپنے حصّے کا اگر سورج نہیں دیتا\nتو پھر اپنی جلا کر ہی روشنی اپنی بنا لیتے ہیں',
    author: 'Bashir Badr',
    language: 'ur',
    transliteration: 'Ujaala apne hisse ka agar sooraj nahi deta\nTo phir apni jalaa kar hi roshni apni bana lete hain',
    translation: 'If the sun does not give us our share of light, then we burn ourselves to make our own.',
  },
  {
    quote: 'دشمنی جم کر کرو، لیکن یہ گنجائش رہے\nجب کبھی ہم دوست ہو جائیں تو شرمندہ نہ ہوں',
    author: 'Bashir Badr',
    language: 'ur',
    transliteration: 'Dushmani jam kar karo, lekin ye gunjaaish rahe\nJab kabhi hum dost ho jaayein to sharminda na hon',
    translation: 'Be enemies, by all means — but leave this much room: that if one day we become friends, we won’t feel ashamed.',
  },

  // ── Daag Dehlvi ──────────────────────────────────────────────────────────
  {
    quote: 'خوب پردہ ہے کہ چلمن سے لگے بیٹھے ہیں\nصاف چھپتے بھی نہیں سامنے آتے بھی نہیں',
    author: 'Daag Dehlvi',
    language: 'ur',
    transliteration: 'Khoob parda hai ke chilman se lage baithe hain\nSaaf chhupte bhi nahi saamne aate bhi nahi',
    translation: 'A fine veil indeed: she sits leaning against the curtain — she neither hides herself fully, nor comes out into view.',
  },

  // ── Hasrat Mohani ────────────────────────────────────────────────────────
  {
    quote: 'چپکے چپکے رات دن آنسو بہانا یاد ہے\nہم کو اب تک عاشقی کا وہ زمانہ یاد ہے',
    author: 'Hasrat Mohani',
    language: 'ur',
    transliteration: 'Chupke chupke raat din aansoo bahaana yaad hai\nHum ko ab tak aashiqi ka woh zamaana yaad hai',
    translation: 'I remember the silent shedding of tears, day and night; even now I remember those days of love.',
  },

  // ── Majrooh Sultanpuri ───────────────────────────────────────────────────
  {
    quote: 'میں اکیلا ہی چلا تھا جانبِ منزل مگر\nلوگ ساتھ آتے گئے اور کارواں بنتا گیا',
    author: 'Majrooh Sultanpuri',
    language: 'ur',
    transliteration: 'Main akela hi chala tha jaanib-e-manzil magar\nLog saath aate gaye aur kaarwaan banta gaya',
    translation: 'I had set out toward my destination alone — yet people kept joining, and a caravan was formed.',
  },

  // ── Hindi · Dushyant Kumar (Saaye Mein Dhoop) ────────────────────────────
  {
    quote: 'हो गई है पीर पर्वत-सी पिघलनी चाहिए\nइस हिमालय से कोई गंगा निकलनी चाहिए',
    author: 'Dushyant Kumar',
    language: 'hi',
    transliteration: 'Ho gayi hai peer parvat-si pighalni chaahiye\nIs Himaalay se koi Ganga nikalni chaahiye',
    translation: 'The pain has grown mountain-like — it must melt; from this Himalaya, some Ganges must flow.',
    source: 'Saaye Mein Dhoop',
  },
  {
    quote: 'सिर्फ़ हंगामा खड़ा करना मेरा मक़सद नहीं\nमेरी कोशिश है कि ये सूरत बदलनी चाहिए',
    author: 'Dushyant Kumar',
    language: 'hi',
    transliteration: 'Sirf hangaama khada karna mera maqsad nahi\nMeri koshish hai ke ye soorat badalni chaahiye',
    translation: 'Merely raising an uproar is not my aim — my effort is that this state of things must change.',
    source: 'Saaye Mein Dhoop',
  },
  {
    quote: 'कैसे आकाश में सूराख़ नहीं हो सकता\nएक पत्थर तो तबीयत से उछालो यारो',
    author: 'Dushyant Kumar',
    language: 'hi',
    transliteration: 'Kaise aakaash mein sooraakh nahi ho sakta\nEk patthar to tabeeyat se uchhaalo yaaro',
    translation: 'How can a hole not appear in the sky? Friends, throw at least one stone with all your heart.',
    source: 'Saaye Mein Dhoop',
  },
  {
    quote: 'कहाँ तो तय था चिराग़ाँ हर एक घर के लिए\nकहाँ चिराग़ मयस्सर नहीं शहर के लिए',
    author: 'Dushyant Kumar',
    language: 'hi',
    transliteration: 'Kahaan to tay tha chiraaghaan har ek ghar ke liye\nKahaan chiraagh mayassar nahi shehar ke liye',
    translation: 'Lamps were promised for every house — and here, not even one lamp is to be had for the whole city.',
    source: 'Saaye Mein Dhoop',
  },

  // ── Hindi · Ramdhari Singh Dinkar ────────────────────────────────────────
  {
    quote: 'क्षमा शोभती उस भुजंग को जिसके पास गरल हो\nउसको क्या जो दंतहीन विषहीन विनीत सरल हो',
    author: 'Ramdhari Singh Dinkar',
    language: 'hi',
    transliteration: 'Kshama shobhti us bhujang ko jiske paas garal ho\nUs ko kya jo dant-heen vish-heen vineet saral ho',
    translation: 'Forgiveness adorns the serpent who carries venom — what does it mean for one toothless, poisonless, meek and simple?',
    source: 'Rashmirathi',
  },
  {
    quote: 'सिंहासन ख़ाली करो कि जनता आती है',
    author: 'Ramdhari Singh Dinkar',
    language: 'hi',
    transliteration: 'Sinhaasan khaali karo ke janta aati hai',
    translation: 'Vacate the throne — the people are coming.',
    source: 'Parashuram ki Pratiksha',
  },
  {
    quote: 'जब नाश मनुज पर छाता है\nपहले विवेक मर जाता है',
    author: 'Ramdhari Singh Dinkar',
    language: 'hi',
    transliteration: 'Jab naash manuj par chhaata hai\nPehle vivek mar jaata hai',
    translation: 'When ruin falls upon a man, his discernment dies first.',
    source: 'Rashmirathi',
  },

  // ── Hindi · Kabir (dohas) ────────────────────────────────────────────────
  {
    quote: 'बुरा जो देखन मैं चला, बुरा न मिलिया कोय\nजो दिल खोजा आपना, मुझसे बुरा न कोय',
    author: 'Kabir',
    language: 'hi',
    transliteration: 'Bura jo dekhan main chala, bura na miliya koy\nJo dil khoja aapna, mujh-se bura na koy',
    translation: 'I went searching for the wicked, but found none; when I searched my own heart, no one was wickeder than I.',
    source: 'Kabir Dohe',
  },
  {
    quote: 'साईं इतना दीजिए, जा में कुटुंब समाय\nमैं भी भूखा न रहूँ, साधु न भूखा जाय',
    author: 'Kabir',
    language: 'hi',
    transliteration: 'Saaeen itna deejiye, ja mein kutumb samaay\nMain bhi bhookha na rahoon, saadhu na bhookha jaay',
    translation: 'O Lord, give me only enough to hold my household — that I do not go hungry, nor any seeker leave my door hungry.',
    source: 'Kabir Dohe',
  },
  {
    quote: 'पोथी पढ़ि पढ़ि जग मुआ, पंडित भया न कोय\nढाई आखर प्रेम का, पढ़े सो पंडित होय',
    author: 'Kabir',
    language: 'hi',
    transliteration: 'Pothi padhi padhi jag mua, pandit bhaya na koy\nDhaai aakhar prem ka, padhe so pandit hoy',
    translation: 'The world died reading book after book — yet none became truly wise; whoever reads the two-and-a-half letters of love, that one is wise.',
    source: 'Kabir Dohe',
  },
  {
    quote: 'माटी कहे कुम्हार से, तू क्या रौंदे मोय\nएक दिन ऐसा आएगा, मैं रौंदूँगी तोय',
    author: 'Kabir',
    language: 'hi',
    transliteration: 'Maati kahe kumhaar se, tu kya raunde moy\nEk din aisa aayega, main raundoongi toy',
    translation: 'The clay says to the potter, "Why do you trample me? A day will come when I shall trample you."',
    source: 'Kabir Dohe',
  },
  {
    quote: 'जैसा भोजन खाइए, तैसा ही मन होय\nजैसा पानी पीजिए, तैसी वाणी होय',
    author: 'Kabir',
    language: 'hi',
    transliteration: 'Jaisa bhojan khaaiye, taisa hi man hoy\nJaisa paani peejiye, taisi vaani hoy',
    translation: 'As is the food you eat, so becomes your mind; as is the water you drink, so becomes your speech.',
    source: 'Kabir Dohe',
  },

  // ── Hindi · Rahim ────────────────────────────────────────────────────────
  {
    quote: 'रहिमन धागा प्रेम का, मत तोड़ो चटकाय\nटूटे से फिर ना जुड़े, जुड़े गाँठ पड़ जाय',
    author: 'Rahim',
    language: 'hi',
    transliteration: 'Rahiman dhaaga prem ka, mat todo chatkaay\nToote se phir na jude, jude gaanth pad jaay',
    translation: 'Rahim says: do not snap the thread of love; once broken, it does not rejoin — and if it does, a knot remains.',
    source: 'Rahim Dohe',
  },
  {
    quote: 'बड़े बड़ाई न करें, बड़े न बोलें बोल\nरहिमन हीरा कब कहे, लाख टका मेरा मोल',
    author: 'Rahim',
    language: 'hi',
    transliteration: 'Bade badaai na karein, bade na bolen bol\nRahiman heera kab kahe, laakh taka mera mol',
    translation: 'The truly great do not boast, nor speak boastful words. When does a diamond ever say, "my price is a hundred thousand"?',
    source: 'Rahim Dohe',
  },

  // ── Hindi · Mahadevi Verma ───────────────────────────────────────────────
  {
    quote: 'मैं नीर भरी दुख की बदली',
    author: 'Mahadevi Verma',
    language: 'hi',
    transliteration: 'Main neer bhari dukh ki badli',
    translation: 'I am a cloud of sorrow, brimming with tears.',
    source: 'Sandhya Geet',
  },

  // ── Punjabi · Bulleh Shah ────────────────────────────────────────────────
  {
    quote: 'ਪੜ੍ਹ ਪੜ੍ਹ ਆਲਮ ਫ਼ਾਜ਼ਲ ਹੋਇਆ\nਕਦੇ ਆਪਣੇ ਆਪ ਨੂੰ ਪੜ੍ਹਿਆ ਨਹੀਂ',
    author: 'Bulleh Shah',
    language: 'pa',
    transliteration: 'Padh padh aalam faazil hoya\nKade aapne aap nu padhya nahi',
    translation: 'You read and read and became a learned scholar — but you never read your own self.',
  },
  {
    quote: 'ਮਸਜਿਦ ਢਾ ਦੇ, ਮੰਦਰ ਢਾ ਦੇ, ਢਾ ਦੇ ਜੋ ਕੁਝ ਢਾਉਂਦਾ\nਪਰ ਕਿਸੇ ਦਾ ਦਿਲ ਨਾ ਢਾਵੀਂ, ਰੱਬ ਦਿਲਾਂ ਵਿੱਚ ਰਹਿੰਦਾ',
    author: 'Bulleh Shah',
    language: 'pa',
    transliteration: 'Masjid dha de, mandir dha de, dha de jo kujh dhaunda\nPar kise da dil na dhaaween, Rabb dilaan vich rehnda',
    translation: 'Tear down the mosque, tear down the temple — tear down whatever you can — but do not break a heart, for God dwells in hearts.',
  },
  {
    quote: 'ਬੁੱਲ੍ਹਾ ਕੀ ਜਾਣਾਂ ਮੈਂ ਕੌਣ',
    author: 'Bulleh Shah',
    language: 'pa',
    transliteration: 'Bullha ki jaanaan main kaun',
    translation: 'Bulleh, what do I know of who I am?',
  },
  {
    quote: 'ਇਲਮੋਂ ਬਸ ਕਰੀਂ ਓ ਯਾਰ',
    author: 'Bulleh Shah',
    language: 'pa',
    transliteration: 'Ilmon bas kareen o yaar',
    translation: 'Enough of bookish knowledge, my friend.',
  },

  // ── Punjabi · Pash ───────────────────────────────────────────────────────
  {
    quote: 'ਸਭ ਤੋਂ ਖ਼ਤਰਨਾਕ ਹੁੰਦਾ ਹੈ ਸਾਡੇ ਸੁਪਨਿਆਂ ਦਾ ਮਰ ਜਾਣਾ',
    author: 'Pash',
    language: 'pa',
    transliteration: 'Sabh ton khatarnaak hunda hai saade supniyaan da mar jaana',
    translation: 'Most dangerous of all is the death of our dreams.',
  },
  {
    quote: 'ਮੈਂ ਘਾਹ ਹਾਂ, ਮੈਂ ਤੁਹਾਡੇ ਹਰ ਕੀਤੇ ਤੇ ਉੱਗ ਆਵਾਂਗਾ',
    author: 'Pash',
    language: 'pa',
    transliteration: 'Main ghaah haan, main tuhaade har keete te ugg aavaanga',
    translation: 'I am grass — I will grow back upon everything you do.',
  },
  {
    quote: 'ਅਸੀਂ ਲੜਾਂਗੇ ਸਾਥੀ, ਉਦਾਸ ਮੌਸਮ ਦੇ ਵਿਰੁੱਧ',
    author: 'Pash',
    language: 'pa',
    transliteration: 'Aseen ladaange saathi, udaas mausam de viruddh',
    translation: 'We will fight, comrade — against this melancholy season.',
  },

  // ── Punjabi · Shiv Kumar Batalvi ─────────────────────────────────────────
  {
    quote: 'ਮਾਏ ਨੀ ਮਾਏ! ਮੈਂ ਇੱਕ ਸ਼ਿਕਰਾ ਯਾਰ ਬਣਾਇਆ',
    author: 'Shiv Kumar Batalvi',
    language: 'pa',
    transliteration: 'Maaye ni maaye! main ikk shikra yaar banaaya',
    translation: 'O mother, mother — I made friends with a hawk.',
  },
  {
    quote: 'ਅਸਾਂ ਤਾਂ ਜੋਬਨ ਰੁੱਤੇ ਮਰਨਾ',
    author: 'Shiv Kumar Batalvi',
    language: 'pa',
    transliteration: 'Asaan taan joban rutte marna',
    translation: 'I, for one, am to die in the season of my youth.',
  },

  // ── Punjabi · Amrita Pritam ──────────────────────────────────────────────
  {
    quote: 'ਅੱਜ ਆਖਾਂ ਵਾਰਿਸ ਸ਼ਾਹ ਨੂੰ, ਕਿਤਿਓਂ ਕਬਰਾਂ ਵਿੱਚੋਂ ਬੋਲ',
    author: 'Amrita Pritam',
    language: 'pa',
    transliteration: 'Ajj aakhaan Waris Shah nu, kition kabraan vichon bol',
    translation: 'Today I call upon Waris Shah — speak from somewhere within your grave.',
    source: 'Ajj Aakhaan Waris Shah Nu',
  },
  {
    quote: 'ਮੈਂ ਤੈਨੂੰ ਫਿਰ ਮਿਲਾਂਗੀ, ਕਿੱਥੇ ਕਿਵੇਂ ਪਤਾ ਨਹੀਂ',
    author: 'Amrita Pritam',
    language: 'pa',
    transliteration: 'Main tenu phir milaangi, kitthe kiven pata nahi',
    translation: 'I will meet you again — where, how, I do not know.',
    source: 'Main Tenu Phir Milaangi',
  },

  // ── Punjabi · Surjit Patar ───────────────────────────────────────────────
  {
    quote: 'ਕੁਝ ਕਿਹਾ ਤਾਂ ਹਨੇਰਾ ਜਰੇਗਾ ਕਿਵੇਂ\nਚੁੱਪ ਰਿਹਾ ਤਾਂ ਸ਼ਮਾਦਾਨ ਕੀ ਕਹਿਣਗੇ',
    author: 'Surjit Patar',
    language: 'pa',
    transliteration: 'Kujh kiha taan hanera jarega kiven\nChup riha taan shamaadaan ki kehnge',
    translation: 'If I speak, how will the darkness bear it? If I stay silent, what will the lamps say?',
  },

  // ── Persian · Rumi (Masnavi-e-Ma'navi & Divan-e-Shams) ───────────────────
  {
    quote: 'بشنو از نی چون حکایت می‌کند\nاز جدایی‌ها شکایت می‌کند',
    author: 'Rumi',
    language: 'fa',
    transliteration: 'Bishnaw az nay chun hikaayat mi-kunad\nAz judaayee-haa shikaayat mi-kunad',
    translation: 'Listen to the reed, how it tells its tale, complaining of separations.',
    source: 'Masnavi-e-Ma’navi',
  },
  {
    quote: 'هر کسی کاو دور ماند از اصل خویش\nباز جوید روزگار وصل خویش',
    author: 'Rumi',
    language: 'fa',
    transliteration: 'Har kasi k-oo door maand az asl-e-khwesh\nBaaz jooyad rozgaar-e-wasl-e-khwesh',
    translation: 'Whoever is parted from his origin longs for the day of his return.',
    source: 'Masnavi-e-Ma’navi',
  },
  {
    quote: 'تو مگو ما را بدان شه بار نیست\nبا کریمان کارها دشوار نیست',
    author: 'Rumi',
    language: 'fa',
    transliteration: 'Tu magoo maa-raa badaan shah baar neest\nBaa kareemaan kaar-haa dushwaar neest',
    translation: 'Do not say we have no audience with that king — with the generous, no work is hard.',
    source: 'Masnavi-e-Ma’navi',
  },
  {
    quote: 'بنمای رخ که باغ و گلستانم آرزوست\nبگشای لب که قند فراوانم آرزوست',
    author: 'Rumi',
    language: 'fa',
    transliteration: 'Binmaa rukh ke baagh-o-gulistaanam aarzoost\nBigshaa lab ke qand-e-faraawaanam aarzoost',
    translation: 'Show your face — I long for a garden and a rose-bed; open your lips — I long for abundant sweetness.',
    source: 'Divan-e-Shams',
  },
  {
    quote: 'از محبت تلخ‌ها شیرین شود\nاز محبت مس‌ها زرین شود',
    author: 'Rumi',
    language: 'fa',
    transliteration: 'Az mohabbat talkh-haa shireen shawad\nAz mohabbat mis-haa zarreen shawad',
    translation: 'By love, bitter things turn sweet; by love, copper turns into gold.',
    source: 'Masnavi-e-Ma’navi',
  },
  {
    quote: 'چه تدبیر ای مسلمانان که من خود را نمی‌دانم\nنه ترسا نه یهودی‌ام نه گبر و نه مسلمانم',
    author: 'Rumi',
    language: 'fa',
    transliteration: 'Che tadbeer ai musalmaanaan ke man khud-raa nameedaanam\nNa tarsaa na yahoodee-am na gabr o na musalmaanam',
    translation: 'What plan, O Muslims? — I do not know who I am: not Christian, not Jew, not Zoroastrian, not Muslim.',
    source: 'Divan-e-Shams',
  },

  // ── Persian · Hafez ──────────────────────────────────────────────────────
  {
    quote: 'هرگز نمیرد آن که دلش زنده شد به عشق\nثبت است بر جریدهٔ عالم دوام ما',
    author: 'Hafez',
    language: 'fa',
    transliteration: 'Hargez na-meerad aan ke dilash zindeh shod be ishq\nSabt ast bar jareeda-ye aalam dawaam-e-maa',
    translation: 'Never dies the one whose heart was made alive by love — our endurance is recorded on the world’s register.',
    source: 'Divan-e-Hafez',
  },

  // ── Persian · Saadi ──────────────────────────────────────────────────────
  {
    quote: 'بنی آدم اعضای یکدیگرند\nکه در آفرینش ز یک گوهرند',
    author: 'Saadi Shirazi',
    language: 'fa',
    transliteration: 'Bani Aadam a’zaa-ye yek deegar-and\nKe dar aafareenash ze yek gohar-and',
    translation: 'Human beings are members of one another; in creation, they are of one essence.',
    source: 'Gulistan',
  },

  // ── English · Marcus Aurelius (Meditations) ──────────────────────────────
  {
    quote: 'You have power over your mind — not outside events. Realize this, and you will find strength.',
    author: 'Marcus Aurelius',
    language: 'en',
    source: 'Meditations',
  },
  {
    quote: 'The happiness of your life depends upon the quality of your thoughts.',
    author: 'Marcus Aurelius',
    language: 'en',
    source: 'Meditations',
  },
  {
    quote: 'Waste no more time arguing about what a good man should be. Be one.',
    author: 'Marcus Aurelius',
    language: 'en',
    source: 'Meditations',
  },
  {
    quote: 'When you arise in the morning, think of what a precious privilege it is to be alive — to breathe, to think, to enjoy, to love.',
    author: 'Marcus Aurelius',
    language: 'en',
    source: 'Meditations',
  },
  {
    quote: 'Confine yourself to the present.',
    author: 'Marcus Aurelius',
    language: 'en',
    source: 'Meditations',
  },

  // ── English · Seneca ─────────────────────────────────────────────────────
  {
    quote: 'We suffer more often in imagination than in reality.',
    author: 'Seneca',
    language: 'en',
    source: 'Letters from a Stoic',
  },
  {
    quote: 'It is not that we have a short time to live, but that we waste a lot of it.',
    author: 'Seneca',
    language: 'en',
    source: 'On the Shortness of Life',
  },
  {
    quote: 'Difficulties strengthen the mind, as labor does the body.',
    author: 'Seneca',
    language: 'en',
  },
  {
    quote: 'Luck is what happens when preparation meets opportunity.',
    author: 'Seneca',
    language: 'en',
  },

  // ── English · Epictetus (Enchiridion / Discourses) ───────────────────────
  {
    quote: 'It is not what happens to you, but how you react to it that matters.',
    author: 'Epictetus',
    language: 'en',
    source: 'Enchiridion',
  },
  {
    quote: 'Wealth consists not in having great possessions, but in having few wants.',
    author: 'Epictetus',
    language: 'en',
  },
  {
    quote: 'First say to yourself what you would be; and then do what you have to do.',
    author: 'Epictetus',
    language: 'en',
    source: 'Discourses',
  },
  {
    quote: 'Man is not worried by real problems so much as by his imagined anxieties about real problems.',
    author: 'Epictetus',
    language: 'en',
  },

  // ── English · Khalil Gibran (The Prophet) ────────────────────────────────
  {
    quote: 'Out of suffering have emerged the strongest souls; the most massive characters are seared with scars.',
    author: 'Khalil Gibran',
    language: 'en',
  },
  {
    quote: 'Your children are not your children. They are the sons and daughters of Life’s longing for itself.',
    author: 'Khalil Gibran',
    language: 'en',
    source: 'The Prophet',
  },
  {
    quote: 'And ever has it been that love knows not its own depth until the hour of separation.',
    author: 'Khalil Gibran',
    language: 'en',
    source: 'The Prophet',
  },

  // ── English · Pablo Neruda ───────────────────────────────────────────────
  {
    quote: 'I want to do with you what spring does with the cherry trees.',
    author: 'Pablo Neruda',
    language: 'en',
    source: 'Twenty Love Poems and a Song of Despair',
  },
  {
    quote: 'You can cut all the flowers but you cannot keep spring from coming.',
    author: 'Pablo Neruda',
    language: 'en',
  },
];

function dateKey(date: Date): string {
  const y = date.getFullYear();
  const m = String(date.getMonth() + 1).padStart(2, '0');
  const d = String(date.getDate()).padStart(2, '0');
  return `${y}-${m}-${d}`;
}

// djb2 — small, deterministic, no deps. Used to map a date string to an index.
function djb2(s: string): number {
  let hash = 5381;
  for (let i = 0; i < s.length; i++) {
    hash = ((hash << 5) + hash) ^ s.charCodeAt(i);
  }
  return hash >>> 0;
}

// Module-level session lock: once a quote is chosen for the current local
// date, every subsequent call in this tab returns the same one — even if the
// user navigates to a sibling page and back. No localStorage, no server.
let sessionDateKey: string | null = null;
let sessionQuote: MultilingualQuote | null = null;

export function getPhilosophicalQuoteInstant(date: Date): MultilingualQuote {
  const key = dateKey(date);
  if (sessionDateKey === key && sessionQuote) return sessionQuote;
  sessionDateKey = key;
  sessionQuote = QUOTES[djb2(key) % QUOTES.length];
  return sessionQuote;
}
