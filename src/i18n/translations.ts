import type { LanguageCode } from '../types/chat';

export interface LanguageOption {
  code: LanguageCode;
  name: string;
  nativeName: string;
  bcp47: string;
  regionHint: string;
}

export const LANGUAGES: LanguageOption[] = [
  {
    code: 'om',
    name: 'Afaan Oromo',
    nativeName: 'Afaan Oromoo',
    bcp47: 'om-ET',
    regionHint: 'Qubee',
  },
  {
    code: 'am',
    name: 'Amharic',
    nativeName: 'አማርኛ',
    bcp47: 'am-ET',
    regionHint: "Ge'ez",
  },
  {
    code: 'ti',
    name: 'Tigrinya',
    nativeName: 'ትግርኛ',
    bcp47: 'ti-ET',
    regionHint: "Ge'ez",
  },
  {
    code: 'en',
    name: 'English',
    nativeName: 'English',
    bcp47: 'en-US',
    regionHint: 'Global',
  },
  {
    code: 'so',
    name: 'Somali',
    nativeName: 'Af-Soomaali',
    bcp47: 'so-SO',
    regionHint: 'Latin',
  },
];

export interface StarterPrompt {
  category: string;
  title: string;
  prompt: string;
}

export interface UIStrings {
  tagline: string;
  welcomeTitle: string;
  welcomeSubtitle: string;
  newChat: string;
  history: string;
  searchHistory: string;
  noHistory: string;
  settings: string;
  languageLabel: string;
  themeLight: string;
  themeDark: string;
  clearChat: string;
  deleteChat: string;
  copy: string;
  copied: string;
  regenerate: string;
  speak: string;
  stopSpeaking: string;
  attachImage: string;
  attachDocument: string;
  voiceInput: string;
  stopVoice: string;
  transcribing: string;
  send: string;
  stopGenerating: string;
  inputPlaceholder: string;
  signIn: string;
  signUp: string;
  logout: string;
  profile: string;
  guestLabel: string;
  guestHint: string;
  cloudSynced: string;
  verifyEmailNotice: string;
  installApp: string;
  offlineNotice: string;
  modelReady: string;
  modelMissing: string;
  messagesUnit: string;
  myProfile: string;
  aboutEthioGPT: string;
  aboutFounder: string;
  licenseLegal: string;
  createAccount: string;
  backToChat: string;
  starterPrompts: StarterPrompt[];
}

export const TRANSLATIONS: Record<LanguageCode, UIStrings> = {
  om: {
    tagline: 'Gargaaraa AI Itoophiyaa Keessan',
    welcomeTitle: 'Akkam! Ani EthioGPT dha.',
    welcomeSubtitle:
      'Barnoota, barreessuu, hiikkaa, qorannoo, suuraa fi dokumantii xiinxaluuf Afaan Oromoo fi afaanota Itoophiyaa birootiin isin gargaaruuf qophiidha.',
    newChat: 'Haasawa Haaraa',
    history: 'Seenaa Haasawaa',
    searchHistory: 'Haasawa barbaadi...',
    noHistory: 'Haasawni kuufame hin jiru',
    settings: 'Qindaa’ina',
    languageLabel: 'Afaan Filadhu',
    themeLight: 'Ifa',
    themeDark: 'Dukkana',
    clearChat: 'Haasawa Qulqulleessi',
    deleteChat: 'Haqi',
    copy: 'Garagalchi',
    copied: 'Garagalfameera',
    regenerate: 'Irra Deebi’i',
    speak: 'Sagaleedhaan Dubbisi',
    stopSpeaking: 'Dhaabi',
    attachImage: 'Suuraa Dabali',
    attachDocument: 'Dokumantii Dabali',
    voiceInput: 'Sagaleedhaan Dubbadhu',
    stopVoice: 'Waraabuu Dhaabi',
    transcribing: 'Sagalee gara barreeffamaatti jijjiiraa jira...',
    send: 'Ergi',
    stopGenerating: 'Dhaabi',
    inputPlaceholder: 'EthioGPT gaafadhu (Afaan Oromoo, Suuraa, ykn PDF)...',
    signIn: 'Seeni',
    signUp: 'Galmaa’i',
    logout: 'Ba’i',
    profile: 'Piroofaayilii',
    guestLabel: 'Keessummaa',
    guestHint: 'Haasawa keessan kuusuuf seenaa',
    cloudSynced: 'Kuusaa duumessaa waliin wal-simeera',
    verifyEmailNotice: 'Haasawa keessan duumessa keessatti kuusuuf imeelii keessan mirkaneessaa.',
    installApp: 'Appii Fe’i',
    offlineNotice: 'Quunnamtiin intarneetii addaan citeera — Seenaa kuufame fayyadamaa jirtu.',
    modelReady: 'Gemini AI qophiidha',
    modelMissing: 'Furtuun Gemini API hin qindaa’in',
    messagesUnit: 'ergaa',
    myProfile: 'Piroofaayilii Koo',
    aboutEthioGPT: 'Waa’ee EthioGPT',
    aboutFounder: 'Waa’ee Hundeessee',
    licenseLegal: 'Hayyama fi Seera',
    createAccount: 'Herrega Haaraa Uumi',
    backToChat: 'Gara Haasawaatti Deebi’i',
    starterPrompts: [
      {
        category: 'Barnootaa fi Qorannoo',
        title: 'Seenaa Gadaa fi Sirna Bulchiinsaa',
        prompt: 'Sirna Gadaa Oromoo keessatti aangoon akkamitti waggaa saddeet saddeetiin darba? Qabxii ijoo isaa Afaan Oromootiin naaf ibsi.',
      },
      {
        category: 'Barreessuu fi Hiikkaa',
        title: 'Xalayaa Hojii Qopheessi',
        prompt: 'Dhaabbata teeknoolojii Finfinnee keessa jiru tokkoof xalayaa iyyannoo hojii (Cover Letter) Afaan Oromoo sirriidhaan naaf barreessi.',
      },
      {
        category: 'Qonna fi Diinagdee',
        title: 'Omisha Bunaa Fooyyessuu',
        prompt: 'Qonnaan bultoonni naannoo Oromiyaa omisha bunaa fi qulqullina isaa guddisuuf tooftaalee ammayyaa maal fa’a fayyadamuu danda’u?',
      },
      {
        category: 'Teeknoolojii',
        title: 'Barnoota Koodingii Jalqabuu',
        prompt: 'Barattoota Itoophiyaatiif garaagarummaa Python fi JavaScript karoora barnootaa torban 4 waliin Afaan Oromootiin ibsi.',
      },
    ],
  },
  am: {
    tagline: 'የኢትዮጵያ AI ረዳትዎ',
    welcomeTitle: 'ሰላም! እኔ EthioGPT ነኝ።',
    welcomeSubtitle:
      'ለትምህርት፣ ለጽሑፍ፣ ለትርጉም፣ ለምርምር፣ እንዲሁም ምስሎችንና ሰነዶችን (PDF) በአማርኛና በሌሎች የኢትዮጵያ ቋንቋዎች ለመተንተን ዝግጁ ነኝ።',
    newChat: 'አዲስ ውይይት',
    history: 'የውይይት ታሪክ',
    searchHistory: 'ውይይቶችን ፈልግ...',
    noHistory: 'የተቀመጠ ውይይት የለም',
    settings: 'ቅንብሮች',
    languageLabel: 'ቋንቋ ይምረጡ',
    themeLight: 'ብርሃን',
    themeDark: 'ጨለማ',
    clearChat: 'ውይይቱን አጽዳ',
    deleteChat: 'ሰርዝ',
    copy: 'ቅዳ',
    copied: 'ተቀድቷል',
    regenerate: 'እንደገና ፍጠር',
    speak: 'በድምፅ አንብብ',
    stopSpeaking: 'አቁም',
    attachImage: 'ምስል አያይዝ',
    attachDocument: 'ሰነድ (PDF/TXT) አያይዝ',
    voiceInput: 'በድምፅ ተናገር',
    stopVoice: 'መቅዳት አቁም',
    transcribing: 'ድምፅን ወደ ጽሑፍ በመቀየር ላይ...',
    send: 'ላክ',
    stopGenerating: 'አቁም',
    inputPlaceholder: 'EthioGPTን ይጠይቁ (አማርኛ፣ ምስል፣ ወይም PDF)...',
    signIn: 'ግባ',
    signUp: 'ተመዝገብ',
    logout: 'ውጣ',
    profile: 'መገለጫ',
    guestLabel: 'እንግዳ',
    guestHint: 'ውይይቶችን ለማስቀመጥ ይግቡ',
    cloudSynced: 'ከደመና ማከማቻ ጋር ተገናኝቷል',
    verifyEmailNotice: 'ውይይቶችን በደመና ለማስቀመጥ ኢሜይልዎን ያረጋግጡ።',
    installApp: 'መተግበሪያውን ጫን',
    offlineNotice: 'ኢንተርኔት የለም — የተቀመጠ መረጃ በመጠቀም ላይ።',
    modelReady: 'Gemini AI ዝግጁ ነው',
    modelMissing: 'የGemini API ቁልፍ አልተዋቀረም',
    messagesUnit: 'መልዕክቶች',
    myProfile: 'የእኔ መገለጫ',
    aboutEthioGPT: 'ስለ EthioGPT',
    aboutFounder: 'ስለ መሥራቹ',
    licenseLegal: 'ፈቃድ እና ህጋዊ መረጃ',
    createAccount: 'አዲስ መለያ ፍጠር',
    backToChat: 'ወደ ውይይት ተመለስ',
    starterPrompts: [
      {
        category: 'ትምህርት እና ታሪክ',
        title: 'የኢትዮጵያ የቀን አቆጣጠር ስርዓት',
        prompt: 'የኢትዮጵያ የቀን አቆጣጠር (13 ወራት) ከግሪጎሪያን አቆጣጠር በምን እንደሚለይ እና እንዴት እንደሚሰላ በግልጽ አማርኛ አብራራልኝ።',
      },
      {
        category: 'ጽሑፍ እና ትርጉም',
        title: 'የሥራ ማመልከቻ ደብዳቤ',
        prompt: 'በአዲስ አበባ ለሚገኝ የሶፍትዌር ልማት ድርጅት የሥራ ማመልከቻ ደብዳቤ (Cover Letter) በተስተካከለ አማርኛ ጻፍልኝ።',
      },
      {
        category: 'ባህል እና ቡና',
        title: 'የኢትዮጵያ ቡና ዝርያዎች',
        prompt: 'የይርጋጨፌ፣ የሐረር እና የጅማ ቡና ጣዕም እና ባህሪያት ልዩነት ምንድን ነው?',
      },
      {
        category: 'ቴክኖሎጂ',
        title: 'Python መማር መጀመር',
        prompt: 'ለጀማሪ የዩኒቨርሲቲ ተማሪ የPython ፕሮግራሚንግ መሰረታዊ ፅንሰ ሀሳቦችን ከቀላል ምሳሌ ጋር በአማርኛ አስረዳኝ።',
      },
    ],
  },
  ti: {
    tagline: 'ናይ ኢትዮጵያ AI ሓጋዚኹም',
    welcomeTitle: 'ሰላም! ኣነ EthioGPT እየ።',
    welcomeSubtitle:
      'ንትምህርቲ፣ ጽሕፈት፣ ትርጉም፣ ምርምር ከምኡውን ስእልታትን ሰነዳትን (PDF) ብትግርኛን ካልኦት ቋንቋታት ኢትዮጵያን ንምትንታን ድሉው እየ።',
    newChat: 'ሓድሽ ዝርርብ',
    history: 'ታሪኽ ዝርርብ',
    searchHistory: 'ዝርርብ ድለ...',
    noHistory: 'ዝተዓቀበ ዝርርብ የለን',
    settings: 'ቅጥዕታት',
    languageLabel: 'ቋንቋ ምረጽ',
    themeLight: 'ብርሃን',
    themeDark: 'ጸልማት',
    clearChat: 'ዝርርብ ኣጽሪ',
    deleteChat: 'ሰርዝ',
    copy: 'ቅዳሕ',
    copied: 'ተቀዲሑ',
    regenerate: 'ዳግማይ ፍጠር',
    speak: 'ብድምጺ ኣንብብ',
    stopSpeaking: 'ኣቋርጽ',
    attachImage: 'ስእሊ ወስኽ',
    attachDocument: 'ሰነድ (PDF/TXT) ወስኽ',
    voiceInput: 'ብድምጺ ተዛረብ',
    stopVoice: 'ምቅራጽ ኣቋርጽ',
    transcribing: 'ድምጺ ናብ ጽሑፍ ይቅየር ኣሎ...',
    send: 'ልኣኽ',
    stopGenerating: 'ኣቋርጽ',
    inputPlaceholder: 'ንEthioGPT ሕተት (ትግርኛ፣ ስእሊ፣ ወይ PDF)...',
    signIn: 'እቶ',
    signUp: 'ተመዝገብ',
    logout: 'ውጻእ',
    profile: 'መግለጺ',
    guestLabel: 'ጋሻ',
    guestHint: 'ዝርርባት ንምዕቃብ እቶ',
    cloudSynced: 'ምስ ደመና ተራኺቡ ኣሎ',
    verifyEmailNotice: 'ዝርርብካ ንምዕቃብ ኢመይልካ ኣረጋግጽ።',
    installApp: 'ኣፕ ጽዓን',
    offlineNotice: 'ኢንተርነት የለን — ዝተዓቀበ ሓበሬታ ትጥቀም ኣለኻ።',
    modelReady: 'Gemini AI ድሉው እዩ',
    modelMissing: 'ቁልፊ Gemini API ኣይተዳለወን',
    messagesUnit: 'መልእኽቲ',
    myProfile: 'መግለጺ ሕሳበይ',
    aboutEthioGPT: 'ብዛዕባ EthioGPT',
    aboutFounder: 'ብዛዕባ መስራቲ',
    licenseLegal: 'ፍቓድን ሕጋዊ ሓበሬታን',
    createAccount: 'ሓድሽ ሕሳብ ክፈት',
    backToChat: 'ናብ ዝርርብ ተመለስ',
    starterPrompts: [
      {
        category: 'ትምህርቲን ባህሊን',
        title: 'ታሪኽን ስነ-ህንጻን ኣኽሱም',
        prompt: 'ብዛዕባ ታሪኻዊ ኣገዳስነት ሓወልቲ ኣኽሱምን ስነ-ህንጻኡን ብጽሩይ ትግርኛ ኣብርሃለይ።',
      },
      {
        category: 'ጽሕፈትን ትርጉምን',
        title: 'ደብዳቤ ምልክታ ስራሕ',
        prompt: 'ንሓደ ትካል ቴክኖሎጂ ናይ ስራሕ መመልከቲ ደብዳቤ (Cover Letter) ብትግርኛ ጽሓፈለይ።',
      },
      {
        category: 'ሕርሻን ከባቢን',
        title: 'ምዕቃብ ሓመድን ማይን',
        prompt: 'ኣብ ከበሳታት ሰሜን ኢትዮጵያ ንምክልኻል ፍግረ መሬትን ምዕቃብ ማይን ዝጠቅሙ ሜላታት እንታይ እዮም?',
      },
      {
        category: 'ቴክኖሎጂ',
        title: 'መሰረታዊ ትምህርቲ HTML & CSS',
        prompt: 'ንጀመርቲ ተምሃሮ ኣፈጣጥራ መርበብ ሓበሬታ ብHTMLን CSSን ብቀሊል ምሳሌ ብትግርኛ ኣረድኣኒ።',
      },
    ],
  },
  en: {
    tagline: 'Your Ethiopian AI Assistant',
    welcomeTitle: 'Selam! I am EthioGPT.',
    welcomeSubtitle:
      'Built for Ethiopia and Ethiopian languages. Ask questions, analyze images or PDFs, translate, study, and write across Afaan Oromo, Amharic, Tigrinya, English, and Somali.',
    newChat: 'New Chat',
    history: 'Chat History',
    searchHistory: 'Search conversations...',
    noHistory: 'No saved conversations yet',
    settings: 'Settings',
    languageLabel: 'Select Language',
    themeLight: 'Light',
    themeDark: 'Dark',
    clearChat: 'Clear Conversation',
    deleteChat: 'Delete',
    copy: 'Copy',
    copied: 'Copied',
    regenerate: 'Regenerate',
    speak: 'Read aloud',
    stopSpeaking: 'Stop',
    attachImage: 'Attach image',
    attachDocument: 'Attach PDF or text document',
    voiceInput: 'Voice input',
    stopVoice: 'Stop recording',
    transcribing: 'Transcribing voice...',
    send: 'Send',
    stopGenerating: 'Stop',
    inputPlaceholder: 'Ask EthioGPT anything, or attach an image / PDF...',
    signIn: 'Log in',
    signUp: 'Sign up',
    logout: 'Log out',
    profile: 'Profile',
    guestLabel: 'Guest Mode',
    guestHint: 'Sign in to sync your chat history',
    cloudSynced: 'Cloud sync active',
    verifyEmailNotice: 'Verify your email address to enable cloud history sync.',
    installApp: 'Install App',
    offlineNotice: 'Offline mode — Viewing cached conversations.',
    modelReady: 'Gemini AI connected',
    modelMissing: 'Gemini API key not configured',
    messagesUnit: 'messages',
    myProfile: 'My Profile',
    aboutEthioGPT: 'About EthioGPT',
    aboutFounder: 'About the Founder',
    licenseLegal: 'License & Legal',
    createAccount: 'Create Account',
    backToChat: 'Back to Chat',
    starterPrompts: [
      {
        category: 'Language & Translation',
        title: 'Learn Everyday Afaan Oromo',
        prompt: 'Teach me 10 essential everyday greetings and polite phrases in Afaan Oromo (Qubee) with pronunciation notes and English translations.',
      },
      {
        category: 'Culture & Heritage',
        title: 'Ethiopian Coffee & Trade History',
        prompt: 'Explain the cultural significance of the Ethiopian coffee ceremony (Buna) and how Ethiopia’s major coffee regions differ in flavor.',
      },
      {
        category: 'Education & Study',
        title: 'Summarize Study Notes or PDFs',
        prompt: 'How can I structure a 4-week university exam study plan for computer science and mathematics? Give me a practical template.',
      },
      {
        category: 'Writing & Tech',
        title: 'Build a Modern Web Project',
        prompt: 'Give me a clean TypeScript + React architecture checklist for building fast, mobile-first web apps in low-bandwidth environments.',
      },
    ],
  },
  so: {
    tagline: 'Kaaliyahaaga AI ee Itoobiya',
    welcomeTitle: 'Salaan! Waxaan ahay EthioGPT.',
    welcomeSubtitle:
      'Waxaan kuu diyaariyay waxbarasho, qoraal, turjumaad, cilmi-baaris, iyo falanqeynta sawirrada iyo dukumeentiyada (PDF) adigoo adeegsanaya Af-Soomaali iyo luqadaha Itoobiya.',
    newChat: 'Sheeko Cusub',
    history: 'Taariikhda Sheekada',
    searchHistory: 'Raadi sheekooyinka...',
    noHistory: 'Sheeko la keydiyay ma jirto',
    settings: 'Dejinta',
    languageLabel: 'Dooro Luqadda',
    themeLight: 'Iftiin',
    themeDark: 'Mugdi',
    clearChat: 'Nadiifi Sheekada',
    deleteChat: 'Tirtir',
    copy: 'Nuqul',
    copied: 'La nuqulay',
    regenerate: 'Dib u soo saar',
    speak: 'Cod ku akhri',
    stopSpeaking: 'Jooji',
    attachImage: 'Ku dar sawir',
    attachDocument: 'Ku dar dukumeenti (PDF/TXT)',
    voiceInput: 'Cod ku hadal',
    stopVoice: 'Jooji duubista',
    transcribing: 'Codka waxaa loo beddelayaa qoraal...',
    send: 'Dir',
    stopGenerating: 'Jooji',
    inputPlaceholder: 'Weydii EthioGPT (Af-Soomaali, Sawir, ama PDF)...',
    signIn: 'Gal',
    signUp: 'Isdiiwaangeli',
    logout: 'Ka bax',
    profile: 'Xogtaada',
    guestLabel: 'Marti',
    guestHint: 'Gal si aad u keydiso taariikhdaada',
    cloudSynced: 'Daruurta waa la isku xiray',
    verifyEmailNotice: 'Xaqiiji iimaylkaaga si aad u keydiso sheekooyinka.',
    installApp: 'Ku rakib App',
    offlineNotice: 'Internet ma jiro — Waxaad aragtaa xogtii hore loo keydiyay.',
    modelReady: 'Gemini AI waa diyaar',
    modelMissing: 'Furaha Gemini API lama dejin',
    messagesUnit: 'fariimo',
    myProfile: 'Xogtayda',
    aboutEthioGPT: 'Ku saabsan EthioGPT',
    aboutFounder: 'Ku saabsan Aasaasaha',
    licenseLegal: 'Shatiga & Sharciga',
    createAccount: 'Samee Akoon Cusub',
    backToChat: 'Ku noqo Sheekada',
    starterPrompts: [
      {
        category: 'Waxbarasho & Suugaan',
        title: 'Suugaanta iyo Maahmaahyada Soomaaliyeed',
        prompt: 'Ii soo bandhig 5 maahmaahood oo Soomaali ah oo xikmad leh iyo macnaha ay xambaarsan yihiin nolol maalmeedka.',
      },
      {
        category: 'Qoraal & Shaqo',
        title: 'Qorista Warqadda Codsiga Shaqada',
        prompt: 'Ii qor warqad codsi shaqo (Cover Letter) oo xirfad leh oo ku qoran Af-Soomaali kuna habboon shaqo IT ama maamul.',
      },
      {
        category: 'Ganacsi & Dhaqaale',
        title: 'Ganacsiga Xoolaha iyo Beeraha',
        prompt: 'Sidee loo horumarin karaa suuq-geynta xoolaha iyo wax-soo-saarka beeraha ee Deegaanka Soomaalida ee Itoobiya?',
      },
      {
        category: 'Tiknoolajiyad',
        title: 'Barashada Programming-ka',
        prompt: 'Iigu sharax Af-Soomaali waxa ay kala yihiin Frontend iyo Backend iyo sida ardaygu u bilaabi karo barashadooda.',
      },
    ],
  },
};
