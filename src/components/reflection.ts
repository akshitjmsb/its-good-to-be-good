import { ai } from "../infra/ai";

// Multilingual quote type
export interface MultilingualQuote {
    quote: string;
    author: string;
    language: 'en' | 'hi' | 'ur' | 'pa';
    transliteration?: string;
    translation?: string;
}

// Cache for philosophical quotes to avoid repeated API calls
const quoteCache = new Map<string, MultilingualQuote & { timestamp: number }>();
const CACHE_DURATION = 15 * 60 * 1000; // 15 minutes

// English Rebellion Poetry Quotes (30)
const ENGLISH_QUOTES: MultilingualQuote[] = [
    { quote: "Still I rise.", author: "Maya Angelou", language: 'en' },
    { quote: "I am not free while any woman is unfree, even when her shackles are very different from my own.", author: "Audre Lorde", language: 'en' },
    { quote: "The most common way people give up their power is by thinking they don't have any.", author: "Alice Walker", language: 'en' },
    { quote: "If you are neutral in situations of injustice, you have chosen the side of the oppressor.", author: "Desmond Tutu", language: 'en' },
    { quote: "Freedom is never voluntarily given by the oppressor; it must be demanded by the oppressed.", author: "Martin Luther King Jr.", language: 'en' },
    { quote: "The revolution is not an apple that falls when it is ripe. You have to make it fall.", author: "Che Guevara", language: 'en' },
    { quote: "I have learned over the years that when one's mind is made up, this diminishes fear.", author: "Rosa Parks", language: 'en' },
    { quote: "Emancipate yourselves from mental slavery. None but ourselves can free our minds.", author: "Bob Marley", language: 'en' },
    { quote: "The only way to deal with an unfree world is to become so absolutely free that your very existence is an act of rebellion.", author: "Albert Camus", language: 'en' },
    { quote: "I would rather die on my feet than live on my knees.", author: "Emiliano Zapata", language: 'en' },
    { quote: "Those who make peaceful revolution impossible will make violent revolution inevitable.", author: "John F. Kennedy", language: 'en' },
    { quote: "Disobedience is the true foundation of liberty. The obedient must be slaves.", author: "Henry David Thoreau", language: 'en' },
    { quote: "The secret of happiness is freedom, and the secret of freedom is courage.", author: "Thucydides", language: 'en' },
    { quote: "They tried to bury us. They didn't know we were seeds.", author: "Mexican Proverb", language: 'en' },
    { quote: "No one is free until we are all free.", author: "Emma Lazarus", language: 'en' },
    { quote: "Injustice anywhere is a threat to justice everywhere.", author: "Martin Luther King Jr.", language: 'en' },
    { quote: "You cannot buy the revolution. You cannot make the revolution. You can only be the revolution.", author: "Ursula K. Le Guin", language: 'en' },
    { quote: "The duty of youth is to challenge corruption.", author: "Kurt Cobain", language: 'en' },
    { quote: "When the people fear the government there is tyranny, when the government fears the people there is liberty.", author: "Thomas Jefferson", language: 'en' },
    { quote: "I am no longer accepting the things I cannot change. I am changing the things I cannot accept.", author: "Angela Davis", language: 'en' },
    { quote: "It is not the consciousness of men that determines their being, but their social being that determines their consciousness.", author: "Karl Marx", language: 'en' },
    { quote: "The oppressed are allowed once every few years to decide which particular representatives of the oppressing class are to represent and repress them.", author: "Karl Marx", language: 'en' },
    { quote: "A riot is the language of the unheard.", author: "Martin Luther King Jr.", language: 'en' },
    { quote: "Better to die fighting for freedom than be a prisoner all the days of your life.", author: "Bob Marley", language: 'en' },
    { quote: "We must always take sides. Neutrality helps the oppressor, never the victim.", author: "Elie Wiesel", language: 'en' },
    { quote: "The people who are crazy enough to think they can change the world are the ones who do.", author: "Steve Jobs", language: 'en' },
    { quote: "First they ignore you, then they ridicule you, then they fight you, and then you win.", author: "Mahatma Gandhi", language: 'en' },
    { quote: "Be the change you wish to see in the world.", author: "Mahatma Gandhi", language: 'en' },
    { quote: "In a gentle way, you can shake the world.", author: "Mahatma Gandhi", language: 'en' },
    { quote: "Power concedes nothing without a demand. It never did and it never will.", author: "Frederick Douglass", language: 'en' }
];

// Hindi Rebellion Poetry Quotes (30)
const HINDI_QUOTES: MultilingualQuote[] = [
    { quote: "सिंहासन खाली करो कि जनता आती है।", author: "रामधारी सिंह दिनकर", language: 'hi', transliteration: "Singhasan khali karo ki janta aati hai.", translation: "Vacate the throne, for the people are coming." },
    { quote: "क्षमा शोभती उस भुजंग को जिसके पास गरल हो।", author: "रामधारी सिंह दिनकर", language: 'hi', transliteration: "Kshama shobhti us bhujang ko jiske paas garal ho.", translation: "Forgiveness suits the serpent who has venom." },
    { quote: "हो गई है पीर पर्वत-सी पिघलनी चाहिए।", author: "दुष्यंत कुमार", language: 'hi', transliteration: "Ho gayi hai peer parvat-si pighalni chahiye.", translation: "The pain has become mountain-like, it must melt." },
    { quote: "सिर्फ हंगामा खड़ा करना मेरा मकसद नहीं, मेरी कोशिश है कि ये सूरत बदलनी चाहिए।", author: "दुष्यंत कुमार", language: 'hi', transliteration: "Sirf hangama khada karna mera maqsad nahi, meri koshish hai ki ye soorat badalni chahiye.", translation: "Creating chaos is not my aim, my effort is to change this situation." },
    { quote: "कहाँ तो तय था चिरागाँ हरेक घर के लिए, कहाँ चिराग मयस्सर नहीं शहर के लिए।", author: "दुष्यंत कुमार", language: 'hi', transliteration: "Kahan to tay tha chiragaan harek ghar ke liye, kahan chiraag mayassar nahi shahar ke liye.", translation: "Where lamps were promised for every home, now not even one lamp is available for the whole city." },
    { quote: "इस देश की आत्मा जब जागेगी, तो राजनीति झुक जाएगी।", author: "रामधारी सिंह दिनकर", language: 'hi', transliteration: "Is desh ki aatma jab jagegi, to rajneeti jhuk jayegi.", translation: "When the soul of this nation awakens, politics will bow down." },
    { quote: "मत कहो आकाश में कोहरा घना है, यह किसी की व्यक्तिगत आलोचना है।", author: "दुष्यंत कुमार", language: 'hi', transliteration: "Mat kaho aakash mein kohra ghana hai, yeh kisi ki vyaktigat aalochna hai.", translation: "Don't say there's thick fog in the sky, this is someone's personal criticism." },
    { quote: "वो मुट्ठी में बंद रखे हैं इंसाफ का सूरज, अब इस धरती पर रौशनी करनी होगी।", author: "गोरख पांडे", language: 'hi', transliteration: "Wo mutthi mein band rakhe hain insaaf ka suraj, ab is dharti par raushni karni hogi.", translation: "They have clenched the sun of justice in their fist, now we must bring light to this earth." },
    { quote: "जो नहीं है भोग के उपयोगी वह सब मेरा है।", author: "गोरख पांडे", language: 'hi', transliteration: "Jo nahi hai bhog ke upyogi woh sab mera hai.", translation: "Everything that is not useful for consumption is mine." },
    { quote: "समझौता नहीं होगा, बहुत तेज रफ्तार है जिंदगी की।", author: "गोरख पांडे", language: 'hi', transliteration: "Samjhauta nahi hoga, bahut tez raftaar hai zindagi ki.", translation: "There will be no compromise, life moves too fast." },
    { quote: "जब तोप मुकाबिल हो तो अखबार निकालो।", author: "अकबर इलाहाबादी", language: 'hi', transliteration: "Jab top muqabil ho to akhbaar nikalo.", translation: "When cannons confront you, publish newspapers." },
    { quote: "मैं जब पैदा हुआ, दुनिया थी एक जंग की, मैं जब मरूँगा, दुनिया होगी एक गाँव की।", author: "नागार्जुन", language: 'hi', transliteration: "Main jab paida hua, duniya thi ek jung ki, main jab marunga, duniya hogi ek gaon ki.", translation: "When I was born, the world was at war; when I die, it will be a village." },
    { quote: "आओ मिलकर जंग लड़ें, अपनी मुक्ति के लिए।", author: "नागार्जुन", language: 'hi', transliteration: "Aao milkar jung laden, apni mukti ke liye.", translation: "Come, let us fight together for our liberation." },
    { quote: "कल तक जहाँ चिंगारियाँ थीं, आज वहाँ शोले हैं।", author: "नागार्जुन", language: 'hi', transliteration: "Kal tak jahan chingariyan thi, aaj wahan shole hain.", translation: "Where there were sparks yesterday, today there are flames." },
    { quote: "जब भी उठी है तलवार, लिखी गई है तारीख।", author: "धूमिल", language: 'hi', transliteration: "Jab bhi uthi hai talwar, likhi gayi hai tareekh.", translation: "Whenever the sword has risen, history has been written." },
    { quote: "एक आदमी रोटी बेलता है, एक आदमी रोटी खाता है, एक तीसरा आदमी है जो न रोटी बेलता है न रोटी खाता है, वह सिर्फ रोटी से खेलता है।", author: "धूमिल", language: 'hi', transliteration: "Ek aadmi roti belta hai, ek aadmi roti khata hai, ek teesra aadmi hai jo na roti belta hai na roti khata hai, woh sirf roti se khelta hai.", translation: "One man makes bread, one eats it, a third neither makes nor eats — he only plays with it." },
    { quote: "मुझे चाहिए मेरे हक की जमीन।", author: "धूमिल", language: 'hi', transliteration: "Mujhe chahiye mere haq ki zameen.", translation: "I want the land that is my right." },
    { quote: "सत्ता की भाषा में बोलता हूँ, लेकिन विरोध में।", author: "केदारनाथ सिंह", language: 'hi', transliteration: "Satta ki bhasha mein bolta hoon, lekin virodh mein.", translation: "I speak in the language of power, but in opposition." },
    { quote: "जो घर जलते देखे हैं, वे जानते हैं आग का मतलब।", author: "केदारनाथ सिंह", language: 'hi', transliteration: "Jo ghar jalte dekhe hain, ve jaante hain aag ka matlab.", translation: "Those who have seen homes burn know the meaning of fire." },
    { quote: "हमें जीना है अपनी शर्तों पर।", author: "मुक्तिबोध", language: 'hi', transliteration: "Humein jeena hai apni sharton par.", translation: "We must live on our own terms." },
    { quote: "अंधेरे में एक चिनगारी भी काफी है।", author: "मुक्तिबोध", language: 'hi', transliteration: "Andhere mein ek chingari bhi kaafi hai.", translation: "Even a single spark is enough in the darkness." },
    { quote: "जो तूफान से डर गया, वह खत्म हो गया।", author: "मुक्तिबोध", language: 'hi', transliteration: "Jo toofan se dar gaya, woh khatm ho gaya.", translation: "He who feared the storm perished." },
    { quote: "मेरी मिट्टी में आग है, मेरे खून में विद्रोह।", author: "सुभद्रा कुमारी चौहान", language: 'hi', transliteration: "Meri mitti mein aag hai, mere khoon mein vidroh.", translation: "There is fire in my soil, rebellion in my blood." },
    { quote: "खूब लड़ी मर्दानी वह तो झाँसी वाली रानी थी।", author: "सुभद्रा कुमारी चौहान", language: 'hi', transliteration: "Khoob ladi mardani woh to Jhansi wali rani thi.", translation: "She fought bravely like a man, she was the Queen of Jhansi." },
    { quote: "सरफरोशी की तमन्ना अब हमारे दिल में है।", author: "राम प्रसाद बिस्मिल", language: 'hi', transliteration: "Sarfaroshi ki tamanna ab hamare dil mein hai.", translation: "The desire to sacrifice our lives is now in our hearts." },
    { quote: "उठो, जागो, और तब तक मत रुको जब तक लक्ष्य प्राप्त न हो जाए।", author: "स्वामी विवेकानंद", language: 'hi', transliteration: "Utho, jago, aur tab tak mat ruko jab tak lakshya prapt na ho jaye.", translation: "Arise, awake, and stop not till the goal is reached." },
    { quote: "तुम मुझे खून दो, मैं तुम्हें आज़ादी दूँगा।", author: "सुभाष चंद्र बोस", language: 'hi', transliteration: "Tum mujhe khoon do, main tumhein azaadi dunga.", translation: "Give me blood, and I will give you freedom." },
    { quote: "दुश्मन की गोलियों का हम सामना करेंगे, आज़ाद हैं आज़ाद रहेंगे।", author: "चंद्रशेखर आज़ाद", language: 'hi', transliteration: "Dushman ki goliyon ka hum samna karenge, azad hain azad rahenge.", translation: "We will face the enemy's bullets, we are free and will remain free." },
    { quote: "जिंदगी तो अपने दम पर जी जाती है, दूसरों के कंधों पर तो जनाज़े उठाए जाते हैं।", author: "भगत सिंह", language: 'hi', transliteration: "Zindagi to apne dam par ji jaati hai, doosron ke kandhon par to janaze uthaye jaate hain.", translation: "Life is lived on one's own strength; on others' shoulders, only funerals are carried." },
    { quote: "इंकलाब जिंदाबाद!", author: "भगत सिंह", language: 'hi', transliteration: "Inquilab Zindabad!", translation: "Long live the revolution!" }
];

// Urdu Rebellion Poetry Quotes (30)
const URDU_QUOTES: MultilingualQuote[] = [
    { quote: "بول کہ لب آزاد ہیں تیرے", author: "فیض احمد فیض", language: 'ur', transliteration: "Bol ke lab azad hain tere", translation: "Speak, for your lips are free." },
    { quote: "لازم ہے کہ ہم بھی دیکھیں گے", author: "فیض احمد فیض", language: 'ur', transliteration: "Lazim hai ke hum bhi dekhenge", translation: "It is certain that we too shall witness." },
    { quote: "ہم دیکھیں گے، لازم ہے کہ ہم بھی دیکھیں گے، وہ دن کہ جس کا وعدہ ہے", author: "فیض احمد فیض", language: 'ur', transliteration: "Hum dekhenge, lazim hai ke hum bhi dekhenge, woh din ke jis ka waada hai", translation: "We shall witness, it is certain that we shall see that promised day." },
    { quote: "مت سمجھو مجھے ختم گلی، میں تو ایک موڑ ہوں", author: "فیض احمد فیض", language: 'ur', transliteration: "Mat samjho mujhe khatam gali, main to ek mor hoon", translation: "Don't think I'm a dead end, I am but a turn." },
    { quote: "دستور اے محکوم سنو، جب ظلم ہو تو ٹوٹ جائے", author: "حبیب جالب", language: 'ur', transliteration: "Dastoor ae mehkoom suno, jab zulm ho to toot jaye", translation: "O oppressed, hear the law — when there is tyranny, break it." },
    { quote: "ایسے دستور کو، سبھ کی تقدیر کو، میں نہیں مانتا، میں نہیں جانتا", author: "حبیب جالب", language: 'ur', transliteration: "Aise dastoor ko, subh ki taqdeer ko, main nahi maanta, main nahi jaanta", translation: "Such a constitution, everyone's fate — I do not accept, I do not know." },
    { quote: "جس دھج سے کوئی مقتل میں گیا، وہ شان سلامت رہتی ہے", author: "بہادر شاہ ظفر", language: 'ur', transliteration: "Jis dhaj se koi maqtal mein gaya, woh shaan salamat rehti hai", translation: "The dignity with which one goes to the gallows, that honor remains forever." },
    { quote: "یہ داغ داغ اجالا، یہ شب گزیدہ سحر", author: "فیض احمد فیض", language: 'ur', transliteration: "Yeh daagh daagh ujala, yeh shab-gazida sahar", translation: "This stained light, this night-bitten dawn." },
    { quote: "اب کے ہم بچھڑے تو شاید کبھی خوابوں میں ملیں", author: "احمد فراز", language: 'ur', transliteration: "Ab ke hum bichhde to shayad kabhi khwabon mein milein", translation: "If we part now, perhaps we'll meet only in dreams." },
    { quote: "میں نے ظالم سے کہا، تجھے تیرے ظلم کا پھل ملے گا", author: "احمد فراز", language: 'ur', transliteration: "Maine zalim se kaha, tujhe tere zulm ka phal milega", translation: "I told the tyrant, you will reap what you sow." },
    { quote: "زندگی لے کے چلو، کہ زندگی ہے بہت", author: "ساحر لدھیانوی", language: 'ur', transliteration: "Zindagi le ke chalo, ke zindagi hai bahut", translation: "Carry on with life, for life is much." },
    { quote: "یہ محلوں، یہ تختوں، یہ تاجوں کی دنیا، یہ انسان کے دشمن سماجوں کی دنیا", author: "ساحر لدھیانوی", language: 'ur', transliteration: "Yeh mehlon, yeh takhton, yeh taajon ki duniya, yeh insaan ke dushman samaajon ki duniya", translation: "This world of palaces, thrones, and crowns — this world of societies that are enemies of mankind." },
    { quote: "وہ سبز مدینے کا رہنے والا، جہاں آدمی آدمی کا بھائی ہو", author: "ساحر لدھیانوی", language: 'ur', transliteration: "Woh sabz madine ka rehne wala, jahan aadmi aadmi ka bhai ho", translation: "That dweller of the green city, where man is brother to man." },
    { quote: "میں اکیلا ہی چلا تھا جانب منزل مگر، لوگ ساتھ آتے گئے اور کارواں بنتا گیا", author: "مجروح سلطان پوری", language: 'ur', transliteration: "Main akela hi chala tha janib-e-manzil magar, log saath aate gaye aur karwan banta gaya", translation: "I walked alone towards my destination, but people kept joining and a caravan formed." },
    { quote: "جوش جنوں میں ہے اضطراب کیا، ہم سے ٹکرائے تو سمندر تھا", author: "جوش ملیح آبادی", language: 'ur', transliteration: "Josh-e-junoon mein hai iztarab kya, hum se takraye to samandar tha", translation: "What is this restlessness in the fervor of passion? When it clashed with us, it was an ocean." },
    { quote: "میں بھی منہ میں زبان رکھتا ہوں، کاش پوچھو کہ مدعا کیا ہے", author: "میر تقی میر", language: 'ur', transliteration: "Main bhi munh mein zubaan rakhta hoon, kaash poocho ke mudda'a kya hai", translation: "I too have a tongue in my mouth, I wish you'd ask what I mean." },
    { quote: "سینے میں جلن آنکھوں میں طوفان سا کیوں ہے، اس شہر میں ہر شخص پریشان سا کیوں ہے", author: "کیفی اعظمی", language: 'ur', transliteration: "Seene mein jalan aankhon mein toofan sa kyun hai, is shehr mein har shakhs pareshan sa kyun hai", translation: "Why is there burning in the chest, a storm in the eyes? Why does everyone in this city seem troubled?" },
    { quote: "اٹھ میری جان، میرے ساتھ ہی چلنا ہے تجھے", author: "کیفی اعظمی", language: 'ur', transliteration: "Uth meri jaan, mere saath hi chalna hai tujhe", translation: "Rise, my love, you must walk with me." },
    { quote: "اک انقلاب چاہیے، اک اور انقلاب چاہیے", author: "علامہ اقبال", language: 'ur', transliteration: "Ek inqilab chahiye, ek aur inqilab chahiye", translation: "A revolution is needed, another revolution is needed." },
    { quote: "خودی کو کر بلند اتنا کہ ہر تقدیر سے پہلے، خدا بندے سے خود پوچھے بتا تیری رضا کیا ہے", author: "علامہ اقبال", language: 'ur', transliteration: "Khudi ko kar buland itna ke har taqdeer se pehle, Khuda bande se khud poochhe bata teri raza kya hai", translation: "Elevate your self so high that before every destiny, God Himself asks: tell me, what is your will?" },
    { quote: "ستاروں سے آگے جہاں اور بھی ہیں", author: "علامہ اقبال", language: 'ur', transliteration: "Sitaron se aage jahan aur bhi hain", translation: "Beyond the stars, there are worlds yet more." },
    { quote: "غلامی میں نہ کام آتی ہیں شمشیریں نہ تدبیریں", author: "علامہ اقبال", language: 'ur', transliteration: "Ghulami mein na kaam aati hain shamsheeren na tadbeerein", translation: "In slavery, neither swords nor strategies are of use." },
    { quote: "مجھے عشق ہے انقلابوں سے، مجھے عشق ہے آندھیوں سے", author: "جون ایلیا", language: 'ur', transliteration: "Mujhe ishq hai inqilabon se, mujhe ishq hai aandhiyon se", translation: "I am in love with revolutions, I am in love with storms." },
    { quote: "آج کا غم، کل کی خوشی ہے، یہ بات سمجھ لینا چاہیے", author: "جون ایلیا", language: 'ur', transliteration: "Aaj ka gham, kal ki khushi hai, yeh baat samajh lena chahiye", translation: "Today's sorrow is tomorrow's joy — understand this." },
    { quote: "ہم ٹوٹ کر بکھر گئے لیکن، ہمارے ٹکڑے بھی روشن ہیں", author: "جون ایلیا", language: 'ur', transliteration: "Hum toot kar bikhar gaye lekin, hamare tukde bhi roshan hain", translation: "We shattered and scattered, but even our pieces are radiant." },
    { quote: "وہ لوگ بہت خوش نصیب تھے جو عشق کو کام سمجھتے تھے", author: "واصف علی واصف", language: 'ur', transliteration: "Woh log bahut khushnaseeb the jo ishq ko kaam samajhte the", translation: "Those were fortunate who considered love their work." },
    { quote: "جو کچھ بھی ہے، وقت کے ساتھ بدل جائے گا", author: "پرویز شاکر", language: 'ur', transliteration: "Jo kuch bhi hai, waqt ke saath badal jayega", translation: "Whatever is, will change with time." },
    { quote: "ہمارے خون میں آگ ہے، ہماری روح میں طوفان", author: "احسان دانش", language: 'ur', transliteration: "Hamare khoon mein aag hai, hamari rooh mein toofan", translation: "There is fire in our blood, a storm in our soul." },
    { quote: "جرات ہو تو راستے نکل آتے ہیں", author: "احسان دانش", language: 'ur', transliteration: "Jurrat ho to raaste nikal aate hain", translation: "If you have courage, paths will emerge." },
    { quote: "سر جھکاؤ گے تو پتھر دیوتا بن جائے گا، اتنا مت چاہو اسے وہ بیوفا بن جائے گا", author: "راحت اندوری", language: 'ur', transliteration: "Sar jhukaoge to patthar devta ban jayega, itna mat chaho use woh bewafa ban jayega", translation: "If you bow your head, even a stone becomes a god; don't want it so much, it will become unfaithful." }
];

// Punjabi Rebellion Poetry Quotes (30)
const PUNJABI_QUOTES: MultilingualQuote[] = [
    { quote: "ਸਭ ਤੋਂ ਖ਼ਤਰਨਾਕ ਹੁੰਦਾ ਹੈ ਸਾਡੇ ਸੁਪਨਿਆਂ ਦਾ ਮਰ ਜਾਣਾ।", author: "ਪਾਸ਼", language: 'pa', transliteration: "Sabh ton khatarnak hunda hai saade supniyan da mar jaana.", translation: "Most dangerous is the death of our dreams." },
    { quote: "ਮੈਂ ਘਾਹ ਹਾਂ, ਮੈਂ ਤੁਹਾਡੇ ਹਰ ਕੀਤੇ ਤੇ ਉੱਗ ਆਵਾਂਗਾ।", author: "ਪਾਸ਼", language: 'pa', transliteration: "Main ghaah haan, main tuhade har keete te ugg aavanga.", translation: "I am grass, I will grow on everything you do." },
    { quote: "ਅਸੀਂ ਲੜਾਂਗੇ ਸਾਥੀ, ਉਦਾਸ ਮੌਸਮ ਦੇ ਵਿਰੁੱਧ।", author: "ਪਾਸ਼", language: 'pa', transliteration: "Aseen ladaange saathi, udaas mausam de viruddh.", translation: "We will fight, comrade, against the sad season." },
    { quote: "ਤੁਸੀਂ ਜਿੱਤ ਕੇ ਵੀ ਹਾਰ ਗਏ, ਅਸੀਂ ਹਾਰ ਕੇ ਵੀ ਜਿੱਤ ਗਏ।", author: "ਪਾਸ਼", language: 'pa', transliteration: "Tuseen jitt ke vi haar gaye, aseen haar ke vi jitt gaye.", translation: "You lost even in victory, we won even in defeat." },
    { quote: "ਜੋ ਵੀ ਮੈਂ ਲਿਖਦਾ ਹਾਂ, ਉਹ ਇਨਕਲਾਬ ਲਈ ਲਿਖਦਾ ਹਾਂ।", author: "ਪਾਸ਼", language: 'pa', transliteration: "Jo vi main likhda haan, uh inqilab lai likhda haan.", translation: "Whatever I write, I write for revolution." },
    { quote: "ਰੱਬ ਤੋਂ ਵੀ ਤੇ ਮੈਥੋਂ ਵੀ ਉੱਚੀ ਮਨੁੱਖਤਾ ਹੈ।", author: "ਬੁੱਲ੍ਹੇ ਸ਼ਾਹ", language: 'pa', transliteration: "Rabb ton vi te maithon vi uchhi manukhtaa hai.", translation: "Higher than God, higher than me, is humanity." },
    { quote: "ਪੜ੍ਹ ਪੜ੍ਹ ਇਲਮ ਤੇ ਫ਼ਾਜ਼ਿਲ ਹੋਇਆ, ਤੇ ਕਦੇ ਆਪਣੇ ਆਪ ਨੂੰ ਪੜ੍ਹਿਆ ਹੀ ਨਹੀਂ।", author: "ਬੁੱਲ੍ਹੇ ਸ਼ਾਹ", language: 'pa', transliteration: "Padh padh ilm te faazil hoya, te kade aapne aap nu padhya hi nahi.", translation: "You read and became learned, but never read yourself." },
    { quote: "ਮਸਜਿਦ ਢਾਹ ਦੇ, ਮੰਦਰ ਢਾਹ ਦੇ, ਢਾਹ ਦੇ ਜੋ ਕੁਝ ਢਾਹੁੰਦਾ, ਪਰ ਕਿਸੇ ਦਾ ਦਿਲ ਨਾ ਢਾਹੀਂ।", author: "ਬੁੱਲ੍ਹੇ ਸ਼ਾਹ", language: 'pa', transliteration: "Masjid dhaah de, mandir dhaah de, dhaah de jo kujh dhaahunda, par kise da dil na dhaaheen.", translation: "Tear down the mosque, tear down the temple, tear down whatever you can, but don't break anyone's heart." },
    { quote: "ਜਿੱਥੇ ਵੀ ਜ਼ੁਲਮ ਹੈ, ਉੱਥੇ ਮੈਂ ਖੜ੍ਹਾ ਹਾਂ।", author: "ਸੰਤ ਰਾਮ ਉਦਾਸੀ", language: 'pa', transliteration: "Jitthe vi zulm hai, uthe main khada haan.", translation: "Wherever there is tyranny, I stand there." },
    { quote: "ਮੇਰੀ ਕਵਿਤਾ ਮੇਰਾ ਹਥਿਆਰ ਹੈ।", author: "ਸੰਤ ਰਾਮ ਉਦਾਸੀ", language: 'pa', transliteration: "Meri kavita mera hathiyaar hai.", translation: "My poetry is my weapon." },
    { quote: "ਅਸੀਂ ਮਜ਼ਦੂਰ ਹਾਂ, ਅਸੀਂ ਕਿਸਾਨ ਹਾਂ, ਅਸੀਂ ਹੀ ਤਾਕਤ ਹਾਂ।", author: "ਸੰਤ ਰਾਮ ਉਦਾਸੀ", language: 'pa', transliteration: "Aseen mazdoor haan, aseen kisaan haan, aseen hi taakat haan.", translation: "We are workers, we are farmers, we are the power." },
    { quote: "ਜਦੋਂ ਤੱਕ ਜ਼ਿੰਦਾ ਹਾਂ, ਲੜਦਾ ਰਹਾਂਗਾ।", author: "ਸੰਤ ਰਾਮ ਉਦਾਸੀ", language: 'pa', transliteration: "Jadon tak zinda haan, ladda rahanga.", translation: "As long as I live, I will keep fighting." },
    { quote: "ਮੈਂ ਤੈਨੂੰ ਫਿਰ ਮਿਲਾਂਗੀ, ਕਿੱਥੇ ਕਿਵੇਂ ਪਤਾ ਨਹੀਂ।", author: "ਅੰਮ੍ਰਿਤਾ ਪ੍ਰੀਤਮ", language: 'pa', transliteration: "Main tenu phir millangi, kithe kiven pata nahi.", translation: "I will meet you again, where and how, I don't know." },
    { quote: "ਅੱਜ ਆਖਾਂ ਵਾਰਿਸ ਸ਼ਾਹ ਨੂੰ, ਕਿਤੇ ਕਬਰਾਂ ਵਿੱਚੋਂ ਬੋਲ।", author: "ਅੰਮ੍ਰਿਤਾ ਪ੍ਰੀਤਮ", language: 'pa', transliteration: "Ajj aakhan Waris Shah nu, kite kabran vichon bol.", translation: "Today I call upon Waris Shah, speak from your grave." },
    { quote: "ਜਿਹੜੇ ਦਰਦ ਨੂੰ ਸਮਝਦੇ ਨੇ, ਉਹ ਚੁੱਪ ਰਹਿੰਦੇ ਨੇ।", author: "ਅੰਮ੍ਰਿਤਾ ਪ੍ਰੀਤਮ", language: 'pa', transliteration: "Jihde dard nu samjhde ne, uh chup rehnde ne.", translation: "Those who understand pain remain silent." },
    { quote: "ਮੇਰੇ ਹੱਥਾਂ ਵਿੱਚ ਕਲਮ ਹੈ, ਤੇਰੇ ਹੱਥਾਂ ਵਿੱਚ ਤਲਵਾਰ।", author: "ਸੁਰਜੀਤ ਪਾਤਰ", language: 'pa', transliteration: "Mere hatthan vich kalam hai, tere hatthan vich talwaar.", translation: "In my hands is a pen, in yours a sword." },
    { quote: "ਮੈਂ ਉਹ ਸ਼ਬਦ ਹਾਂ ਜੋ ਕਦੇ ਚੁੱਪ ਨਹੀਂ ਹੁੰਦਾ।", author: "ਸੁਰਜੀਤ ਪਾਤਰ", language: 'pa', transliteration: "Main uh shabad haan jo kade chup nahi hunda.", translation: "I am the word that never falls silent." },
    { quote: "ਰਾਤ ਭਾਵੇਂ ਜਿੰਨੀ ਵੀ ਲੰਬੀ ਹੋਵੇ, ਸਵੇਰ ਜ਼ਰੂਰ ਆਉਂਦੀ ਹੈ।", author: "ਸੁਰਜੀਤ ਪਾਤਰ", language: 'pa', transliteration: "Raat bhaven jinni vi lambi hove, sawer zaroor aundi hai.", translation: "No matter how long the night, morning always comes." },
    { quote: "ਮੈਂ ਬਾਗ਼ੀ ਹਾਂ, ਮੈਨੂੰ ਬਾਗ਼ੀ ਰਹਿਣ ਦਿਓ।", author: "ਲਾਲ ਸਿੰਘ ਦਿਲ", language: 'pa', transliteration: "Main baaghi haan, mainu baaghi rehn dio.", translation: "I am a rebel, let me remain a rebel." },
    { quote: "ਜਿੱਥੇ ਵੀ ਜ਼ੁਲਮ ਹੈ, ਮੇਰੀ ਆਵਾਜ਼ ਉੱਥੇ ਪਹੁੰਚੇਗੀ।", author: "ਲਾਲ ਸਿੰਘ ਦਿਲ", language: 'pa', transliteration: "Jitthe vi zulm hai, meri awaaz uthe pahunchegi.", translation: "Wherever there is injustice, my voice will reach there." },
    { quote: "ਮੈਂ ਉਹ ਅੱਗ ਹਾਂ ਜੋ ਬੁਝਦੀ ਨਹੀਂ।", author: "ਲਾਲ ਸਿੰਘ ਦਿਲ", language: 'pa', transliteration: "Main uh agg haan jo bujhdi nahi.", translation: "I am the fire that does not extinguish." },
    { quote: "ਮੈਂ ਤੇਰੇ ਅੱਗੇ ਨਹੀਂ ਝੁਕਦਾ।", author: "ਲਾਲ ਸਿੰਘ ਦਿਲ", language: 'pa', transliteration: "Main tere agge nahi jhukda.", translation: "I do not bow before you." },
    { quote: "ਇੱਕ ਚਿੰਗਾਰੀ ਬੱਸ ਕਾਫ਼ੀ ਹੈ ਜੰਗਲ ਨੂੰ ਸਾੜਨ ਲਈ।", author: "ਸ਼ਿਵ ਕੁਮਾਰ ਬਟਾਲਵੀ", language: 'pa', transliteration: "Ikk chingaari bass kaafi hai jungle nu saarhan lai.", translation: "One spark is enough to burn the forest." },
    { quote: "ਮੈਂ ਦਰਦ ਨੂੰ ਸ਼ਬਦਾਂ ਵਿੱਚ ਬੰਨ੍ਹਦਾ ਹਾਂ।", author: "ਸ਼ਿਵ ਕੁਮਾਰ ਬਟਾਲਵੀ", language: 'pa', transliteration: "Main dard nu shabdan vich bannhda haan.", translation: "I bind pain into words." },
    { quote: "ਮੇਰਾ ਦਰਦ ਹੀ ਮੇਰੀ ਤਾਕਤ ਹੈ।", author: "ਸ਼ਿਵ ਕੁਮਾਰ ਬਟਾਲਵੀ", language: 'pa', transliteration: "Mera dard hi meri taakat hai.", translation: "My pain is my strength." },
    { quote: "ਲੂਣਾ ਵਰਗੀ ਧੀ ਜੰਮੀ, ਸੂਰਜ ਵਰਗਾ ਪੁੱਤ।", author: "ਸ਼ਿਵ ਕੁਮਾਰ ਬਟਾਲਵੀ", language: 'pa', transliteration: "Luna wargi dhi jammi, suraj warga putt.", translation: "A daughter like Luna was born, a son like the sun." },
    { quote: "ਜਦੋਂ ਜ਼ੁਲਮ ਕਾਨੂੰਨ ਬਣ ਜਾਵੇ, ਬਗ਼ਾਵਤ ਫ਼ਰਜ਼ ਹੈ।", author: "ਭਗਤ ਸਿੰਘ", language: 'pa', transliteration: "Jadon zulm kanoon ban jave, baghawat farz hai.", translation: "When tyranny becomes law, rebellion is duty." },
    { quote: "ਮੈਂ ਨਾਸਤਿਕ ਕਿਉਂ ਹਾਂ।", author: "ਭਗਤ ਸਿੰਘ", language: 'pa', transliteration: "Main naastik kyon haan.", translation: "Why I am an atheist." },
    { quote: "ਇਨਕਲਾਬ ਜ਼ਿੰਦਾਬਾਦ!", author: "ਭਗਤ ਸਿੰਘ", language: 'pa', transliteration: "Inqilab Zindabad!", translation: "Long live the revolution!" }
];

// Combine all quotes
const ALL_QUOTES: MultilingualQuote[] = [...ENGLISH_QUOTES, ...HINDI_QUOTES, ...URDU_QUOTES, ...PUNJABI_QUOTES];

// Get a multilingual quote - shuffles every 15 minutes
function getMultilingualQuote(date: Date): MultilingualQuote {
    // Calculate 15-minute intervals since start of year
    const startOfYear = new Date(date.getFullYear(), 0, 1).getTime();
    const intervalMs = 15 * 60 * 1000; // 15 minutes in milliseconds
    const intervalIndex = Math.floor((date.getTime() - startOfYear) / intervalMs);

    // Rotate through languages: 0=English, 1=Hindi, 2=Urdu, 3=Punjabi
    const languageIndex = intervalIndex % 4;
    const languages = ['en', 'hi', 'ur', 'pa'] as const;
    const selectedLanguage = languages[languageIndex];

    // Get quotes for selected language
    const languageQuotes = ALL_QUOTES.filter(q => q.language === selectedLanguage);

    // Select quote within that language pool
    const quoteIndex = Math.floor(intervalIndex / 4) % languageQuotes.length;

    return languageQuotes[quoteIndex];
}

// Get cache key based on 15-minute interval
function getIntervalCacheKey(date: Date): string {
    const startOfYear = new Date(date.getFullYear(), 0, 1).getTime();
    const intervalMs = 15 * 60 * 1000;
    const intervalIndex = Math.floor((date.getTime() - startOfYear) / intervalMs);
    return `${date.getFullYear()}-${intervalIndex}`;
}

// Instant quote loading - returns immediately with curated content
export function getPhilosophicalQuoteInstant(date: Date): MultilingualQuote {
    const cacheKey = getIntervalCacheKey(date);

    // Check cache first
    const cached = quoteCache.get(cacheKey);
    if (cached && (Date.now() - cached.timestamp) < CACHE_DURATION) {
        const { timestamp, ...quote } = cached;
        return quote;
    }

    // Return curated quote instantly
    return getMultilingualQuote(date);
}

// Background AI quote generation - doesn't block the UI
export async function generateAIPhilosophicalQuote(date: Date): Promise<MultilingualQuote> {
    const cacheKey = getIntervalCacheKey(date);

    // Check cache first
    const cached = quoteCache.get(cacheKey);
    if (cached && (Date.now() - cached.timestamp) < CACHE_DURATION) {
        const { timestamp, ...quote } = cached;
        return quote;
    }

    if (!ai) {
        return getMultilingualQuote(date);
    }

    try {
        const prompt = `Generate a profound, thought-provoking quote from a famous philosopher that would inspire deep reflection. The quote should be:
1. From a well-known philosopher (Socrates, Plato, Aristotle, Marcus Aurelius, Epictetus, Seneca, Nietzsche, Kant, etc.)
2. Profound and meaningful for daily reflection
3. 1-2 sentences maximum
4. Timeless and universally applicable
5. Format as: "Quote text" - Philosopher Name

Make it different from common quotes and choose something that would make someone pause and think deeply about life, wisdom, or human nature.`;

        const response = await ai.models.generateContent({
            model: 'sonar-pro',
            contents: prompt,
        });

        const fullText = response.text.trim();
        const parts = fullText.split(' - ');

        if (parts.length >= 2) {
            const quoteText = parts[0].replace(/^["']|["']$/g, '').trim();
            const author = parts[1].trim();

            const quote: MultilingualQuote = { quote: quoteText, author, language: 'en' };

            // Cache the result
            quoteCache.set(cacheKey, {
                ...quote,
                timestamp: Date.now()
            });

            return quote;
        } else {
            // Fallback if parsing fails
            return getMultilingualQuote(date);
        }
    } catch (error) {
        console.error("Error generating philosophical quote:", error);
        return getMultilingualQuote(date);
    }
}

// Show a subtle loading indicator for AI quote generation
export function showQuoteLoadingIndicator() {
    const lifePointerEl = document.getElementById('life-pointer-display-day');
    if (lifePointerEl) {
        const loadingIndicator = lifePointerEl.querySelector('.loading-indicator');
        if (!loadingIndicator) {
            const indicator = document.createElement('div');
            indicator.className = 'loading-indicator text-xs text-gray-500 mt-2 opacity-70';
            indicator.textContent = '✨ Generating personalized quote...';
            lifePointerEl.appendChild(indicator);
        }
    }
}

// Hide the loading indicator
export function hideQuoteLoadingIndicator() {
    const lifePointerEl = document.getElementById('life-pointer-display-day');
    if (lifePointerEl) {
        const loadingIndicator = lifePointerEl.querySelector('.loading-indicator');
        if (loadingIndicator) {
            loadingIndicator.remove();
        }
    }
}

