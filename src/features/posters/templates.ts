/**
 * Poster Generator Template Presets.
 * Curated bilingual marketing designs for Indian rural agribusiness:
 * Cattle feed launches, festive wishes, seasonal offers, and PVC irrigation.
 */

import type { PosterTemplatePreset } from '@/lib/pdf/types';

export const POSTER_TEMPLATES: PosterTemplatePreset[] = [
  {
    id: 'cattle-feed-fresh-batch',
    title: 'Fresh Feed Arrival (नवीन पेंड व मका)',
    category: 'cattle_feed_announcement',
    aspect_ratio: '1:1',
    tagline: 'गोठ्यातील दुधाळ जनावरांसाठी उत्कृष्ट पोषण',
    headline: 'नवीन ताजी पेंड व मका उपलब्ध!',
    subheadline: 'उच्च प्रथिने (Protein) आणि जास्तीत जास्त दूध वाढीची १००% खात्री',
    highlights: [
      '✓ अस्सल सरकी व सोया पेंड थेट फॅक्टरीमधून',
      '✓ उत्कृष्ट दर्जाचा बारीक भरडलेला पिवळा मका',
      '✓ उत्तम फॅट (FAT) आणि SNF वाढीसाठी सर्वोत्तम',
      '✓ शेतकरी बंधूंसाठी थेट घाऊक व किरकोळ दरात',
    ],
    footer_callout: 'आजच संपर्क करा आणि गोठ्यातील उत्पादन वाढवा!',
    theme: {
      bg_gradient: ['#0f172a', '#1e293b'],
      card_bg: '#1e293b',
      accent_color: '#f59e0b',
      text_color: '#f8fafc',
      badge_bg: '#f59e0b',
      badge_text: '#78350f',
    },
  },
  {
    id: 'milk-yield-booster',
    title: 'Milk Yield Booster (दूध वाढ स्पेशल)',
    category: 'product_promo',
    aspect_ratio: '1:1',
    tagline: 'कमी खर्चात जास्तीत जास्त नफा मिळवा',
    headline: 'विशेष दर्जेदार संतुलित गो-खाद्य',
    subheadline: 'गाय व म्हशींच्या नियमित आहारासाठी पोषक जीवनसत्त्वांचा खजिना',
    highlights: [
      '✓ कॅल्शियम व फॉस्फरस युक्त परिपूर्ण मिश्रण',
      '✓ पचनास अत्यंत हलके व रुचकर चारा पूरक',
      '✓ आजारपणापासून जनावरांचा सुरक्षित बचाव',
      '✓ मोफत घरपोच डिलिव्हरी उपलब्ध',
    ],
    footer_callout: 'ऑर्डर देण्यासाठी त्वरित कॉल करा / व्हॉट्सॲप करा',
    theme: {
      bg_gradient: ['#7c2d12', '#431407'],
      card_bg: '#451a03',
      accent_color: '#fbbf24',
      text_color: '#fffbeb',
      badge_bg: '#fbbf24',
      badge_text: '#78350f',
    },
  },
  {
    id: 'festival-diwali',
    title: 'Diwali Greetings (दीपावली शुभेच्छा)',
    category: 'festival',
    aspect_ratio: '1:1',
    tagline: 'रुषी ॲग्रो अँड सप्लायर्स तर्फे',
    headline: 'शुभ दीपावलीच्या हार्दिक शुभेच्छा!',
    subheadline:
      'ही दिवाळी आपल्या कुटुंबास सुख, समृद्धी, उत्तम आरोग्य आणि भरभराट घेऊन येवो.',
    highlights: [
      '★ समृद्ध शेती आणि आनंदी गोधन',
      '★ आपले प्रेम आणि विश्वास हीच आमची खरी प्रेरणा',
      '★ सदैव आपल्या सेवेत तत्पर',
    ],
    footer_callout: 'आपल्या विश्वासाबद्दल सर्व शेतकरी बांधवांचे मनापासून आभार!',
    theme: {
      bg_gradient: ['#3b0764', '#1e1b4b'],
      card_bg: '#2e1065',
      accent_color: '#facc15',
      text_color: '#faf5ff',
      badge_bg: '#facc15',
      badge_text: '#713f12',
    },
  },
  {
    id: 'festival-pola',
    title: 'Bail Pola Festival (बैल पोळा सण)',
    category: 'festival',
    aspect_ratio: '1:1',
    tagline: 'शेतकऱ्यांचा सखा आणि कष्टाचा खरा सोबती',
    headline: 'बैल पोळ्याच्या मनःपूर्वक शुभेच्छा!',
    subheadline: 'मातीच्या सुवासात राबणाऱ्या बळीराजास आणि सर्जा-राजास विनम्र अभिवादन.',
    highlights: [
      '★ गोवंश संवर्धन आणि शेतकऱ्यांची समृद्धी',
      '★ बैलांच्या आरोग्यासाठी सकस आणि उत्तम चारा आहार',
      '★ समृद्ध शेतीसाठी सदैव सोबत',
    ],
    footer_callout: 'बळीराजाच्या प्रगतीसाठी आमची अविरत सेवा!',
    theme: {
      bg_gradient: ['#064e3b', '#022c22'],
      card_bg: '#065f46',
      accent_color: '#34d399',
      text_color: '#ecfdf5',
      badge_bg: '#34d399',
      badge_text: '#064e3b',
    },
  },
  {
    id: 'pvc-irrigation-promo',
    title: 'PVC & Drip Irrigation (ठिबक व पाईप्स)',
    category: 'pvc_promo',
    aspect_ratio: '1:1',
    tagline: 'शेतातील प्रत्येक थेंबाचे अचूक व काटेकोर नियोजन',
    headline: 'ISI प्रमाणित PVC पाईप्स व फिटिंग्ज',
    subheadline: 'उच्च दाबाची क्षमता आणि दीर्घायुष्याची मजबूत गॅरंटी',
    highlights: [
      '✓ ड्रीप (ठिबक), स्प्रिंकलर व रेनगन सिस्टीम्स',
      '✓ हेवी ड्युटी PVC, UPVC आणि CPVC फिटिंग्ज',
      '✓ शेती व बोअरवेलसाठी सर्व आकारांचे पाईप्स',
      '✓ थेट कंपनीच्या वाजवी दरात उपलब्ध',
    ],
    footer_callout: 'सर्व प्रकारचे स्पेअर्स व साहित्य एकाच छताखाली उपलब्ध!',
    theme: {
      bg_gradient: ['#083344', '#0c4a6e'],
      card_bg: '#0e7490',
      accent_color: '#38bdf8',
      text_color: '#f0f9ff',
      badge_bg: '#38bdf8',
      badge_text: '#082f49',
    },
  },
];
