import type { Language } from './language.tsx'

type CopyRecord = { readonly [K in Language]: string }

export function t(record: CopyRecord, language: Language): string {
  return record[language]
}

export function formatCopy(
  template: CopyRecord,
  language: Language,
  values: Record<string, string | number>,
): string {
  let result = template[language]
  Object.entries(values).forEach(([key, value]) => {
    result = result.replaceAll(`{${key}}`, String(value))
  })
  return result
}

export function bodyFontClass(language: Language): 'font-sans' | 'font-hindi' {
  return language === 'hi' ? 'font-hindi' : 'font-sans'
}

export const phaseLabels: Record<string, CopyRecord> = {
  follicular: { en: 'Follicular', hi: 'फॉलिकुलर' },
  menstrual: { en: 'Menstruating', hi: 'मासिक' },
  ovulatory: { en: 'Ovulatory', hi: 'ओव्यूलेटरी' },
  luteal: { en: 'Luteal', hi: 'ल्यूटियल' },
  pmos: { en: 'PMOS', hi: 'PMOS' },
  menopause: { en: 'Menopause', hi: 'रजोनिवृत्ति' },
  pregnancy_lactation: { en: 'Pregnancy / Lactation', hi: 'गर्भावस्था / स्तनपान' },
}

export const nutrientLabels: Record<'iron' | 'calcium' | 'vit_d' | 'b12', CopyRecord> = {
  iron: { en: 'Iron', hi: 'लोहा' },
  calcium: { en: 'Calcium', hi: 'कैल्शियम' },
  vit_d: { en: 'Vitamin D', hi: 'विटामिन डी' },
  b12: { en: 'Vitamin B12', hi: 'विटामिन बी12' },
}

export const nav: Record<string, CopyRecord> = {
  home: { en: 'Home', hi: 'मुख्य' },
  chat: { en: 'Chat', hi: 'बातचीत' },
  history: { en: 'History', hi: 'इतिहास' },
  profile: { en: 'Profile', hi: 'प्रोफ़ाइल' },
}

export const copy = {
  login: {
    title: { en: 'AURA-Nutri', hi: 'AURA-Nutri' },
    subtitle: {
      en: 'Log in to continue',
      hi: 'जारी रखने के लिए लॉग इन करें',
    },
    usernameLabel: { en: 'Username', hi: 'उपयोगकर्ता नाम' },
    usernamePlaceholder: { en: 'Your username', hi: 'आपका उपयोगकर्ता नाम' },
    passwordLabel: { en: 'Password', hi: 'पासवर्ड' },
    passwordPlaceholder: { en: '••••••', hi: '••••••' },
    continue: { en: 'Continue', hi: 'जारी रखें' },
    saving: { en: 'Logging in...', hi: 'लॉग इन हो रहा है...' },
    wrongPassword: {
      en: 'Incorrect password. Try "test123" for this demo.',
      hi: 'गलत पासवर्ड। इस डेमो के लिए "test123" आज़माएँ।',
    },
    genericError: {
      en: 'Unable to connect. Please check your network and try again.',
      hi: 'कनेक्ट नहीं हो सका। कृपया अपना नेटवर्क जाँचें और पुनः प्रयास करें।',
    },
  },
  onboarding: {
    title: { en: 'AURA-Nutri', hi: 'AURA-Nutri' },
    subtitle: {
      en: 'Enter your name and phase',
      hi: 'अपना नाम और अवस्था दर्ज करें',
    },
    nameLabel: { en: 'Name', hi: 'नाम' },
    namePlaceholder: { en: 'Your name', hi: 'आपका नाम' },
    phaseLabel: { en: 'Phase', hi: 'अवस्था' },
    phaseHint: {
      en: 'Targets adjust automatically based on your phase.',
      hi: 'आपकी अवस्था के अनुसार लक्ष्य स्वचालित रूप से समायोजित होते हैं।',
    },
    continue: { en: 'Continue', hi: 'जारी रखें' },
    saving: { en: 'Saving...', hi: 'सहेजा जा रहा है...' },
  },
  dashboard: {
    greeting: { en: 'Namaste, {name}', hi: 'नमस्ते, {name}' },
    phaseLabel: { en: 'Phase', hi: 'अवस्था' },
    logout: { en: 'Logout', hi: 'लॉग आउट' },
    close: { en: 'Close', hi: 'बंद करें' },
    errorTitle: { en: 'Error', hi: 'त्रुटि' },
    loadFallback: {
      en: 'Unable to load dashboard.',
      hi: 'डैशबोर्ड लोड नहीं हो सका।',
    },
    voiceTitle: {
      en: 'What did you eat today?',
      hi: 'आज आपने क्या खाया?',
    },
    voiceHint: {
      en: 'Tap the mic and speak your meal',
      hi: 'माइक्रोफ़ोन दबाकर अपना भोजन बोलें',
    },
    placeholder: {
      en: 'e.g. "1 bowl dal, 2 roti, 1 glass milk"',
      hi: 'उदाहरण: "1 कटोरी दाल, 2 रोटी, 1 गिलास दूध"',
    },
    logMeal: { en: 'Log Meal', hi: 'खाना दर्ज करें' },
    parseMeal: { en: 'Parse Meal', hi: 'भोजन विश्लेषित करें' },
    confirmLog: { en: 'Confirm & Log', hi: 'पुष्टि करें और दर्ज करें' },
    cancel: { en: 'Cancel', hi: 'रद्द करें' },
    previewTitle: { en: 'Review your meal', hi: 'अपने भोजन की समीक्षा करें' },
    logMealHint: {
      en: 'Tap to parse what you typed or spoke',
      hi: 'टाइप किया या बोला हुआ भोजन विश्लेषित करने के लिए दबाएँ',
    },
    confirmHint: {
      en: 'Adjust quantities or remove items, then confirm to save.',
      hi: 'मात्रा समायोजित करें या आइटम हटाएँ, फिर सहेजने के लिए पुष्टि करें।',
    },
    quantity: { en: 'Quantity (g)', hi: 'मात्रा (ग्राम)' },
    remove: { en: 'Remove', hi: 'हटाएँ' },
    parsing: { en: 'Parsing...', hi: 'विश्लेषण हो रहा है...' },
    logging: { en: 'Saving...', hi: 'सहेजा जा रहा है...' },
    noMatchError: {
      en: 'No foods matched. Edit the text and try again.',
      hi: 'कोई खाद्य पदार्थ मेल नहीं हुआ। टेक्स्ट संपादित करें और पुनः प्रयास करें।',
    },
    parseError: {
      en: 'Could not understand. Please rephrase.',
      hi: 'समझ नहीं आया। कृपया दोबारा कहें।',
    },
    logError: {
      en: 'Could not log meal.',
      hi: 'भोजन दर्ज नहीं किया जा सका।',
    },
    loadError: {
      en: 'Dashboard could not load. Please retry.',
      hi: 'डैशबोर्ड लोड नहीं हो सका। कृपया पुनः प्रयास करें।',
    },
    retry: { en: 'Retry', hi: 'पुनः प्रयास करें' },
    parsedResult: { en: 'Parsed result', hi: 'विश्लेषण परिणाम' },
    notMatched: { en: 'not matched', hi: 'मेल नहीं हुआ' },
    calories: { en: 'kcal', hi: 'कैलोरी' },
    protein: { en: 'protein', hi: 'प्रोटीन' },
    iron: { en: 'iron', hi: 'लोहा' },
    progressTitle: { en: "Today's progress", hi: 'आज की प्रगति' },
    dailyGoalsTitle: { en: '7-day goals', hi: '7 दिन के लक्ष्य' },
    weeklyTrendsTitle: { en: '7-day trends', hi: '7 दिन का ट्रेंड' },
    weeklyEmpty: {
      en: 'Log a few meals to see your weekly trends.',
      hi: 'साप्ताहिक ट्रेंड देखने के लिए कुछ भोजन दर्ज करें।',
    },
    emptyTitle: {
      en: 'No data yet',
      hi: 'अभी तक कोई आँकड़ा नहीं',
    },
    emptyBody: {
      en: 'Tap the + button and tell us what you ate today.',
      hi: 'आज क्या खाया यह बताने के लिए + बटन दबाएँ।',
    },
  },
  chat: {
    title: { en: 'AURA Assistant', hi: 'AURA सहायक' },
    clear: { en: 'Clear', hi: 'साफ़ करें' },
    emptyPrompt: {
      en: 'Ask anything about nutrition.',
      hi: 'पोषण के बारे में कुछ भी पूछें।',
    },
    emptyExample: {
      en: 'e.g. "What should I eat for more iron?"',
      hi: 'उदाहरण: "आयरन बढ़ाने के लिए क्या खाएँ?"',
    },
    typing: { en: 'Thinking...', hi: 'सोच रहे हैं...' },
    placeholder: { en: 'Type your question...', hi: 'अपना सवाल लिखें...' },
    send: { en: 'Send', hi: 'भेजें' },
  },
  voice: {
    unsupported: {
      en: 'Speech recognition is not supported in this browser.',
      hi: 'इस ब्राउज़र में भाषण पहचान समर्थित नहीं है।',
    },
    noSpeech: {
      en: 'Nothing was heard. Please try again.',
      hi: 'कुछ सुना नहीं गया। कृपया पुनः प्रयास करें।',
    },
    audioCapture: {
      en: 'Microphone access not available. Please check settings.',
      hi: 'माइक्रोफ़ोन उपलब्ध नहीं है। कृपया सेटिंग्स जाँचें।',
    },
    notAllowed: {
      en: 'Mic permission denied. Please allow it in browser settings.',
      hi: 'माइक्रोफ़ोन अनुमति अस्वीकृत। कृपया ब्राउज़र सेटिंग्स में इसे अनुमति दें।',
    },
    genericError: {
      en: 'Voice input failed. Please try again or type your meal.',
      hi: 'आवाज़ इनपुट विफल। कृपया पुनः प्रयास करें या टाइप करें।',
    },
  },
  riskBadge: {
    LOW: { en: 'LOW', hi: 'कम' },
    MEDIUM: { en: 'MEDIUM', hi: 'मध्यम' },
    HIGH: { en: 'HIGH', hi: 'ज़्यादा' },
    HIGH_RISK: { en: 'HIGH RISK', hi: 'ज़्यादा जोखिम' },
    overall: { en: 'Overall', hi: 'कुल मिलाकर' },
  },
  history: {
    title: { en: 'History', hi: 'इतिहास' },
    trendTitle: { en: '14-Day Trend', hi: '14 दिन का ट्रेंड' },
    summaryTitle: { en: 'Summary', hi: 'सारांश' },
    daysLogged: { en: '{days} days logged', hi: '{days} दिन दर्ज किए' },
    overallRisk: { en: 'Overall risk: {risk}', hi: 'कुल जोखिम: {risk}' },
    emptyTitle: { en: 'No meals logged yet', hi: 'अभी तक कोई भोजन दर्ज नहीं' },
    emptyBody: {
      en: 'Tap the + button and tell us what you ate. Your meals will appear here.',
      hi: '+ बटन दबाकर बताएँ कि आपने क्या खाया। आपके भोजन यहाँ दिखाई देंगे।',
    },
    loadError: {
      en: 'History could not load. Please retry.',
      hi: 'इतिहास लोड नहीं हो सका। कृपया पुनः प्रयास करें।',
    },
    retry: { en: 'Retry', hi: 'पुनः प्रयास करें' },
    loadMore: { en: 'Load more', hi: 'और लोड करें' },
    loadingMore: { en: 'Loading...', hi: 'लोड हो रहा है...' },
    date: { en: 'Date', hi: 'तारीख' },
    time: { en: 'Time', hi: 'समय' },
    meal: { en: 'Meal', hi: 'भोजन' },
    energy: { en: 'Energy', hi: 'ऊर्जा' },
    protein: { en: 'Protein', hi: 'प्रोटीन' },
    iron: { en: 'Iron', hi: 'लोहा' },
    calcium: { en: 'Calcium', hi: 'कैल्शियम' },
    vit_d: { en: 'Vit D', hi: 'विटामिन डी' },
    b12: { en: 'B12', hi: 'विटामिन बी12' },
    suggestionIron: {
      en: 'A bit more dal, spinach, or sesame most days would help close the gap.',
      hi: 'थोड़ी और दाल, पालक या तिल ज़्यादातर दिन खाने से यह बेहतर होगा।',
    },
    suggestionCalcium: {
      en: 'Adding paneer, curd, or a glass of milk regularly would strengthen this.',
      hi: 'पनीर, दही या एक गिलास दूध नियमित रूप से लेने से यह मज़बूत होगा।',
    },
    suggestionVitD: {
      en: 'More eggs, fish, and some midday sun would push this up.',
      hi: 'अंडे, मछली और दोपहर की धूप से यह बढ़ेगा।',
    },
    suggestionB12: {
      en: 'Eggs, fish, or curd a few times a week would keep B12 on track.',
      hi: 'अंडे, मछली या दही हफ़्ते में कुछ बार लेने से B12 संतुलित रहेगा।',
    },
  },
  profile: {
    title: { en: 'Profile', hi: 'प्रोफ़ाइल' },
    setupTitle: { en: 'Complete your profile', hi: 'अपनी प्रोफ़ाइल पूरी करें' },
    setupSubtitle: {
      en: 'Confirm your name and choose your phase. Targets will adjust automatically.',
      hi: 'अपना नाम पुष्टि करें और अपनी अवस्था चुनें। लक्ष्य स्वचालित रूप से समायोजित होंगे।',
    },
    setupError: {
      en: 'Could not save profile. Please try again.',
      hi: 'प्रोफ़ाइल सहेज नहीं सकी। कृपया पुनः प्रयास करें।',
    },
    save: { en: 'Save & Continue', hi: 'सहेजें और जारी रखें' },
    personal: { en: 'Personal details', hi: 'व्यक्तिगत विवरण' },
    name: { en: 'Name', hi: 'नाम' },
    username: { en: 'Username', hi: 'उपयोगकर्ता नाम' },
    age: { en: 'Age', hi: 'उम्र' },
    ageNotSet: { en: 'Not set', hi: 'दर्ज नहीं' },
    edit: { en: 'Edit', hi: 'संपादित करें' },
    cancel: { en: 'Cancel', hi: 'रद्द करें' },
    saveChanges: { en: 'Save changes', hi: 'परिवर्तन सहेजें' },
    usernameTaken: {
      en: 'This username is already taken. Please choose another one.',
      hi: 'यह उपयोगकर्ता नाम पहले से लिया गया है। कृपया कोई और चुनें।',
    },
    phase: { en: 'Current phase', hi: 'वर्तमान अवस्था' },
    phaseAdjust: { en: 'Cycle phase adjuster', hi: 'चक्र अवस्था समायोजक' },
    phaseHint: {
      en: 'Shift your phase by a few days or set it directly. Targets update automatically.',
      hi: 'अपनी अवस्था को कुछ दिन आगे-पीछे करें या सीधे चुनें। लक्ष्य स्वचालित रूप से अपडेट होंगे।',
    },
    shiftBack2: { en: '-2 days', hi: '-2 दिन' },
    shiftBack1: { en: '-1 day', hi: '-1 दिन' },
    shiftForward1: { en: '+1 day', hi: '+1 दिन' },
    shiftForward2: { en: '+2 days', hi: '+2 दिन' },
    setPhase: { en: 'Set phase', hi: 'अवस्था चुनें' },
    phaseUpdated: { en: 'Phase updated', hi: 'अवस्था अपडेट हुई' },
    phaseUpdateError: {
      en: 'Could not update phase. Please try again.',
      hi: 'अवस्था अपडेट नहीं हो सकी। कृपया पुनः प्रयास करें।',
    },
    streakTitle: { en: 'Streak & cheat days', hi: 'स्ट्रीक और चीट डे' },
    currentStreak: { en: 'Current streak', hi: 'वर्तमान स्ट्रीक' },
    longestStreak: { en: 'Longest streak', hi: 'सबसे लंबी स्ट्रीक' },
    cheatCharms: { en: 'Cheat charms available', hi: 'उपलब्ध चीट आकर्षण' },
    nextCharm: { en: 'Next charm on', hi: 'अगला आकर्षण' },
    nextCharmUnknown: { en: 'Available now', hi: 'अभी उपलब्ध' },
    useCheatDay: { en: 'Use cheat charm', hi: 'चीट आकर्षण का उपयोग करें' },
    cheatDayUsed: { en: 'Cheat charm used', hi: 'चीट आकर्षण उपयोग किया गया' },
    cheatDayUnavailable: { en: 'No charm available', hi: 'कोई आकर्षण उपलब्ध नहीं' },
    days: { en: 'days', hi: 'दिन' },
    logoutHint: {
      en: 'Logout is available from the avatar menu in the top bar.',
      hi: 'लॉग आउट ऊपरी पट्टी में अवतार मेनू से उपलब्ध है।',
    },
    loadError: {
      en: 'Profile could not load. Please retry.',
      hi: 'प्रोफ़ाइल लोड नहीं हो सकी। कृपया पुनः प्रयास करें।',
    },
    retry: { en: 'Retry', hi: 'पुनः प्रयास करें' },
    updating: { en: 'Updating...', hi: 'अपडेट हो रहा है...' },
  },
} as const
