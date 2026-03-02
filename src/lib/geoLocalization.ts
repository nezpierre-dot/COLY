/**
 * Localized names for countries and cities.
 * Key = English canonical name, values = translations per locale.
 * If a name is the same in all languages (e.g. "New York"), it can be omitted.
 */

export type AppLocale = "fr" | "en" | "es" | "de" | "pt" | "it" | "ar";

export const AVAILABLE_LANGUAGES: { code: AppLocale; label: string; flag: string }[] = [
  { code: "fr", label: "Français", flag: "🇫🇷" },
  { code: "en", label: "English", flag: "🇬🇧" },
  { code: "es", label: "Español", flag: "🇪🇸" },
  { code: "de", label: "Deutsch", flag: "🇩🇪" },
  { code: "pt", label: "Português", flag: "🇵🇹" },
  { code: "it", label: "Italiano", flag: "🇮🇹" },
  { code: "ar", label: "العربية", flag: "🇸🇦" },
];

// Country translations: key = English name
const COUNTRY_NAMES: Record<string, Partial<Record<AppLocale, string>>> = {
  "France": { fr: "France", es: "Francia", de: "Frankreich", pt: "França", it: "Francia", ar: "فرنسا" },
  "Germany": { fr: "Allemagne", es: "Alemania", de: "Deutschland", pt: "Alemanha", it: "Germania", ar: "ألمانيا" },
  "Spain": { fr: "Espagne", es: "España", de: "Spanien", pt: "Espanha", it: "Spagna", ar: "إسبانيا" },
  "Italy": { fr: "Italie", es: "Italia", de: "Italien", pt: "Itália", it: "Italia", ar: "إيطاليا" },
  "United Kingdom": { fr: "Royaume-Uni", es: "Reino Unido", de: "Vereinigtes Königreich", pt: "Reino Unido", it: "Regno Unito", ar: "المملكة المتحدة" },
  "United States": { fr: "États-Unis", es: "Estados Unidos", de: "Vereinigte Staaten", pt: "Estados Unidos", it: "Stati Uniti", ar: "الولايات المتحدة" },
  "United States of America": { fr: "États-Unis", es: "Estados Unidos", de: "Vereinigte Staaten", pt: "Estados Unidos", it: "Stati Uniti", ar: "الولايات المتحدة" },
  "Canada": { fr: "Canada", es: "Canadá", de: "Kanada", pt: "Canadá", it: "Canada", ar: "كندا" },
  "Belgium": { fr: "Belgique", es: "Bélgica", de: "Belgien", pt: "Bélgica", it: "Belgio", ar: "بلجيكا" },
  "Switzerland": { fr: "Suisse", es: "Suiza", de: "Schweiz", pt: "Suíça", it: "Svizzera", ar: "سويسرا" },
  "Netherlands": { fr: "Pays-Bas", es: "Países Bajos", de: "Niederlande", pt: "Países Baixos", it: "Paesi Bassi", ar: "هولندا" },
  "Portugal": { fr: "Portugal", es: "Portugal", de: "Portugal", pt: "Portugal", it: "Portogallo", ar: "البرتغال" },
  "Austria": { fr: "Autriche", es: "Austria", de: "Österreich", pt: "Áustria", it: "Austria", ar: "النمسا" },
  "Poland": { fr: "Pologne", es: "Polonia", de: "Polen", pt: "Polônia", it: "Polonia", ar: "بولندا" },
  "Sweden": { fr: "Suède", es: "Suecia", de: "Schweden", pt: "Suécia", it: "Svezia", ar: "السويد" },
  "Norway": { fr: "Norvège", es: "Noruega", de: "Norwegen", pt: "Noruega", it: "Norvegia", ar: "النرويج" },
  "Denmark": { fr: "Danemark", es: "Dinamarca", de: "Dänemark", pt: "Dinamarca", it: "Danimarca", ar: "الدنمارك" },
  "Finland": { fr: "Finlande", es: "Finlandia", de: "Finnland", pt: "Finlândia", it: "Finlandia", ar: "فنلندا" },
  "Ireland": { fr: "Irlande", es: "Irlanda", de: "Irland", pt: "Irlanda", it: "Irlanda", ar: "أيرلندا" },
  "Greece": { fr: "Grèce", es: "Grecia", de: "Griechenland", pt: "Grécia", it: "Grecia", ar: "اليونان" },
  "Turkey": { fr: "Turquie", es: "Turquía", de: "Türkei", pt: "Turquia", it: "Turchia", ar: "تركيا" },
  "Russia": { fr: "Russie", es: "Rusia", de: "Russland", pt: "Rússia", it: "Russia", ar: "روسيا" },
  "China": { fr: "Chine", es: "China", de: "China", pt: "China", it: "Cina", ar: "الصين" },
  "Japan": { fr: "Japon", es: "Japón", de: "Japan", pt: "Japão", it: "Giappone", ar: "اليابان" },
  "South Korea": { fr: "Corée du Sud", es: "Corea del Sur", de: "Südkorea", pt: "Coreia do Sul", it: "Corea del Sud", ar: "كوريا الجنوبية" },
  "India": { fr: "Inde", es: "India", de: "Indien", pt: "Índia", it: "India", ar: "الهند" },
  "Brazil": { fr: "Brésil", es: "Brasil", de: "Brasilien", pt: "Brasil", it: "Brasile", ar: "البرازيل" },
  "Mexico": { fr: "Mexique", es: "México", de: "Mexiko", pt: "México", it: "Messico", ar: "المكسيك" },
  "Argentina": { fr: "Argentine", es: "Argentina", de: "Argentinien", pt: "Argentina", it: "Argentina", ar: "الأرجنتين" },
  "Australia": { fr: "Australie", es: "Australia", de: "Australien", pt: "Austrália", it: "Australia", ar: "أستراليا" },
  "South Africa": { fr: "Afrique du Sud", es: "Sudáfrica", de: "Südafrika", pt: "África do Sul", it: "Sudafrica", ar: "جنوب أفريقيا" },
  "Morocco": { fr: "Maroc", es: "Marruecos", de: "Marokko", pt: "Marrocos", it: "Marocco", ar: "المغرب" },
  "Algeria": { fr: "Algérie", es: "Argelia", de: "Algerien", pt: "Argélia", it: "Algeria", ar: "الجزائر" },
  "Tunisia": { fr: "Tunisie", es: "Túnez", de: "Tunesien", pt: "Tunísia", it: "Tunisia", ar: "تونس" },
  "Egypt": { fr: "Égypte", es: "Egipto", de: "Ägypten", pt: "Egito", it: "Egitto", ar: "مصر" },
  "Senegal": { fr: "Sénégal", es: "Senegal", de: "Senegal", pt: "Senegal", it: "Senegal", ar: "السنغال" },
  "Ivory Coast": { fr: "Côte d'Ivoire", es: "Costa de Marfil", de: "Elfenbeinküste", pt: "Costa do Marfim", it: "Costa d'Avorio", ar: "ساحل العاج" },
  "Cameroon": { fr: "Cameroun", es: "Camerún", de: "Kamerun", pt: "Camarões", it: "Camerun", ar: "الكاميرون" },
  "Nigeria": { fr: "Nigéria", es: "Nigeria", de: "Nigeria", pt: "Nigéria", it: "Nigeria", ar: "نيجيريا" },
  "Saudi Arabia": { fr: "Arabie saoudite", es: "Arabia Saudita", de: "Saudi-Arabien", pt: "Arábia Saudita", it: "Arabia Saudita", ar: "المملكة العربية السعودية" },
  "United Arab Emirates": { fr: "Émirats arabes unis", es: "Emiratos Árabes Unidos", de: "Vereinigte Arabische Emirate", pt: "Emirados Árabes Unidos", it: "Emirati Arabi Uniti", ar: "الإمارات العربية المتحدة" },
  "Thailand": { fr: "Thaïlande", es: "Tailandia", de: "Thailand", pt: "Tailândia", it: "Thailandia", ar: "تايلاند" },
  "Vietnam": { fr: "Viêt Nam", es: "Vietnam", de: "Vietnam", pt: "Vietnã", it: "Vietnam", ar: "فيتنام" },
  "Indonesia": { fr: "Indonésie", es: "Indonesia", de: "Indonesien", pt: "Indonésia", it: "Indonesia", ar: "إندونيسيا" },
  "Colombia": { fr: "Colombie", es: "Colombia", de: "Kolumbien", pt: "Colômbia", it: "Colombia", ar: "كولومبيا" },
  "Chile": { fr: "Chili", es: "Chile", de: "Chile", pt: "Chile", it: "Cile", ar: "تشيلي" },
  "Romania": { fr: "Roumanie", es: "Rumanía", de: "Rumänien", pt: "Romênia", it: "Romania", ar: "رومانيا" },
  "Czech Republic": { fr: "République tchèque", es: "República Checa", de: "Tschechien", pt: "República Tcheca", it: "Repubblica Ceca", ar: "جمهورية التشيك" },
  "Hungary": { fr: "Hongrie", es: "Hungría", de: "Ungarn", pt: "Hungria", it: "Ungheria", ar: "المجر" },
  "Croatia": { fr: "Croatie", es: "Croacia", de: "Kroatien", pt: "Croácia", it: "Croazia", ar: "كرواتيا" },
  "Luxembourg": { fr: "Luxembourg", es: "Luxemburgo", de: "Luxemburg", pt: "Luxemburgo", it: "Lussemburgo", ar: "لوكسمبورغ" },
  "Singapore": { fr: "Singapour", es: "Singapur", de: "Singapur", pt: "Singapura", it: "Singapore", ar: "سنغافورة" },
  "New Zealand": { fr: "Nouvelle-Zélande", es: "Nueva Zelanda", de: "Neuseeland", pt: "Nova Zelândia", it: "Nuova Zelanda", ar: "نيوزيلندا" },
  "Malaysia": { fr: "Malaisie", es: "Malasia", de: "Malaysia", pt: "Malásia", it: "Malesia", ar: "ماليزيا" },
  "Philippines": { fr: "Philippines", es: "Filipinas", de: "Philippinen", pt: "Filipinas", it: "Filippine", ar: "الفلبين" },
  "Pakistan": { fr: "Pakistan", es: "Pakistán", de: "Pakistan", pt: "Paquistão", it: "Pakistan", ar: "باكستان" },
  "Bangladesh": { fr: "Bangladesh", es: "Bangladés", de: "Bangladesch", pt: "Bangladesh", it: "Bangladesh", ar: "بنغلاديش" },
  "Peru": { fr: "Pérou", es: "Perú", de: "Peru", pt: "Peru", it: "Perù", ar: "بيرو" },
  "Cuba": { fr: "Cuba", es: "Cuba", de: "Kuba", pt: "Cuba", it: "Cuba", ar: "كوبا" },
  "Israel": { fr: "Israël", es: "Israel", de: "Israel", pt: "Israel", it: "Israele", ar: "إسرائيل" },
  "Lebanon": { fr: "Liban", es: "Líbano", de: "Libanon", pt: "Líbano", it: "Libano", ar: "لبنان" },
  "Jordan": { fr: "Jordanie", es: "Jordania", de: "Jordanien", pt: "Jordânia", it: "Giordania", ar: "الأردن" },
  "Iraq": { fr: "Irak", es: "Irak", de: "Irak", pt: "Iraque", it: "Iraq", ar: "العراق" },
  "Iran": { fr: "Iran", es: "Irán", de: "Iran", pt: "Irã", it: "Iran", ar: "إيران" },
  "Kenya": { fr: "Kenya", es: "Kenia", de: "Kenia", pt: "Quênia", it: "Kenya", ar: "كينيا" },
  "Ghana": { fr: "Ghana", es: "Ghana", de: "Ghana", pt: "Gana", it: "Ghana", ar: "غانا" },
  "Ethiopia": { fr: "Éthiopie", es: "Etiopía", de: "Äthiopien", pt: "Etiópia", it: "Etiopia", ar: "إثيوبيا" },
  "Tanzania": { fr: "Tanzanie", es: "Tanzania", de: "Tansania", pt: "Tanzânia", it: "Tanzania", ar: "تنزانيا" },
  "Congo": { fr: "Congo", es: "Congo", de: "Kongo", pt: "Congo", it: "Congo", ar: "الكونغو" },
  "Madagascar": { fr: "Madagascar", es: "Madagascar", de: "Madagaskar", pt: "Madagáscar", it: "Madagascar", ar: "مدغشقر" },
  "Mali": { fr: "Mali", es: "Malí", de: "Mali", pt: "Mali", it: "Mali", ar: "مالي" },
  "Niger": { fr: "Niger", es: "Níger", de: "Niger", pt: "Níger", it: "Niger", ar: "النيجر" },
  "Burkina Faso": { fr: "Burkina Faso", es: "Burkina Faso", de: "Burkina Faso", pt: "Burquina Fasso", it: "Burkina Faso", ar: "بوركينا فاسو" },
  "Togo": { fr: "Togo", es: "Togo", de: "Togo", pt: "Togo", it: "Togo", ar: "توغو" },
  "Benin": { fr: "Bénin", es: "Benín", de: "Benin", pt: "Benim", it: "Benin", ar: "بنين" },
  "Guinea": { fr: "Guinée", es: "Guinea", de: "Guinea", pt: "Guiné", it: "Guinea", ar: "غينيا" },
  "Gabon": { fr: "Gabon", es: "Gabón", de: "Gabun", pt: "Gabão", it: "Gabon", ar: "الغابون" },
  "Mauritania": { fr: "Mauritanie", es: "Mauritania", de: "Mauretanien", pt: "Mauritânia", it: "Mauritania", ar: "موريتانيا" },
  "Chad": { fr: "Tchad", es: "Chad", de: "Tschad", pt: "Chade", it: "Ciad", ar: "تشاد" },
  "Libya": { fr: "Libye", es: "Libia", de: "Libyen", pt: "Líbia", it: "Libia", ar: "ليبيا" },
  "Ukraine": { fr: "Ukraine", es: "Ucrania", de: "Ukraine", pt: "Ucrânia", it: "Ucraina", ar: "أوكرانيا" },
  "Andorra": { fr: "Andorre", es: "Andorra", de: "Andorra", pt: "Andorra", it: "Andorra", ar: "أندورا" },
  "Albania": { fr: "Albanie", es: "Albania", de: "Albanien", pt: "Albânia", it: "Albania", ar: "ألبانيا" },
  "Armenia": { fr: "Arménie", es: "Armenia", de: "Armenien", pt: "Armênia", it: "Armenia", ar: "أرمينيا" },
  "Azerbaijan": { fr: "Azerbaïdjan", es: "Azerbaiyán", de: "Aserbaidschan", pt: "Azerbaijão", it: "Azerbaigian", ar: "أذربيجان" },
  "Belarus": { fr: "Biélorussie", es: "Bielorrusia", de: "Belarus", pt: "Bielorrússia", it: "Bielorussia", ar: "بيلاروسيا" },
  "Bosnia And Herzegovina": { fr: "Bosnie-Herzégovine", es: "Bosnia y Herzegovina", de: "Bosnien und Herzegowina", pt: "Bósnia e Herzegovina", it: "Bosnia ed Erzegovina", ar: "البوسنة والهرسك" },
  "Bulgaria": { fr: "Bulgarie", es: "Bulgaria", de: "Bulgarien", pt: "Bulgária", it: "Bulgaria", ar: "بلغاريا" },
  "Cyprus": { fr: "Chypre", es: "Chipre", de: "Zypern", pt: "Chipre", it: "Cipro", ar: "قبرص" },
  "Estonia": { fr: "Estonie", es: "Estonia", de: "Estland", pt: "Estônia", it: "Estonia", ar: "إستونيا" },
  "Georgia": { fr: "Géorgie", es: "Georgia", de: "Georgien", pt: "Geórgia", it: "Georgia", ar: "جورجيا" },
  "Iceland": { fr: "Islande", es: "Islandia", de: "Island", pt: "Islândia", it: "Islanda", ar: "أيسلندا" },
  "Kosovo": { fr: "Kosovo", es: "Kosovo", de: "Kosovo", pt: "Kosovo", it: "Kosovo", ar: "كوسوفو" },
  "Latvia": { fr: "Lettonie", es: "Letonia", de: "Lettland", pt: "Letônia", it: "Lettonia", ar: "لاتفيا" },
  "Liechtenstein": { fr: "Liechtenstein", es: "Liechtenstein", de: "Liechtenstein", pt: "Liechtenstein", it: "Liechtenstein", ar: "ليختنشتاين" },
  "Lithuania": { fr: "Lituanie", es: "Lituania", de: "Litauen", pt: "Lituânia", it: "Lituania", ar: "ليتوانيا" },
  "Malta": { fr: "Malte", es: "Malta", de: "Malta", pt: "Malta", it: "Malta", ar: "مالطا" },
  "Moldova": { fr: "Moldavie", es: "Moldavia", de: "Moldau", pt: "Moldávia", it: "Moldavia", ar: "مولدوفا" },
  "Monaco": { fr: "Monaco", es: "Mónaco", de: "Monaco", pt: "Mônaco", it: "Monaco", ar: "موناكو" },
  "Montenegro": { fr: "Monténégro", es: "Montenegro", de: "Montenegro", pt: "Montenegro", it: "Montenegro", ar: "الجبل الأسود" },
  "North Macedonia": { fr: "Macédoine du Nord", es: "Macedonia del Norte", de: "Nordmazedonien", pt: "Macedônia do Norte", it: "Macedonia del Nord", ar: "مقدونيا الشمالية" },
  "San Marino": { fr: "Saint-Marin", es: "San Marino", de: "San Marino", pt: "San Marino", it: "San Marino", ar: "سان مارينو" },
  "Serbia": { fr: "Serbie", es: "Serbia", de: "Serbien", pt: "Sérvia", it: "Serbia", ar: "صربيا" },
  "Slovakia": { fr: "Slovaquie", es: "Eslovaquia", de: "Slowakei", pt: "Eslováquia", it: "Slovacchia", ar: "سلوفاكيا" },
  "Slovenia": { fr: "Slovénie", es: "Eslovenia", de: "Slowenien", pt: "Eslovênia", it: "Slovenia", ar: "سلوفينيا" },
  "Vatican City": { fr: "Vatican", es: "Ciudad del Vaticano", de: "Vatikanstadt", pt: "Vaticano", it: "Città del Vaticano", ar: "الفاتيكان" },
  "Afghanistan": { fr: "Afghanistan", es: "Afganistán", de: "Afghanistan", pt: "Afeganistão", it: "Afghanistan", ar: "أفغانستان" },
  "Bahrain": { fr: "Bahreïn", es: "Baréin", de: "Bahrain", pt: "Bahrein", it: "Bahrein", ar: "البحرين" },
  "Cambodia": { fr: "Cambodge", es: "Camboya", de: "Kambodscha", pt: "Camboja", it: "Cambogia", ar: "كمبوديا" },
  "North Korea": { fr: "Corée du Nord", es: "Corea del Norte", de: "Nordkorea", pt: "Coreia do Norte", it: "Corea del Nord", ar: "كوريا الشمالية" },
  "Kuwait": { fr: "Koweït", es: "Kuwait", de: "Kuwait", pt: "Kuwait", it: "Kuwait", ar: "الكويت" },
  "Mongolia": { fr: "Mongolie", es: "Mongolia", de: "Mongolei", pt: "Mongólia", it: "Mongolia", ar: "منغوليا" },
  "Myanmar": { fr: "Birmanie", es: "Myanmar", de: "Myanmar", pt: "Mianmar", it: "Birmania", ar: "ميانمار" },
  "Nepal": { fr: "Népal", es: "Nepal", de: "Nepal", pt: "Nepal", it: "Nepal", ar: "نيبال" },
  "Oman": { fr: "Oman", es: "Omán", de: "Oman", pt: "Omã", it: "Oman", ar: "عمان" },
  "Qatar": { fr: "Qatar", es: "Catar", de: "Katar", pt: "Catar", it: "Qatar", ar: "قطر" },
  "Sri Lanka": { fr: "Sri Lanka", es: "Sri Lanka", de: "Sri Lanka", pt: "Sri Lanka", it: "Sri Lanka", ar: "سريلانكا" },
  "Syria": { fr: "Syrie", es: "Siria", de: "Syrien", pt: "Síria", it: "Siria", ar: "سوريا" },
  "Taiwan": { fr: "Taïwan", es: "Taiwán", de: "Taiwan", pt: "Taiwan", it: "Taiwan", ar: "تايوان" },
  "Uzbekistan": { fr: "Ouzbékistan", es: "Uzbekistán", de: "Usbekistan", pt: "Uzbequistão", it: "Uzbekistan", ar: "أوزبكستان" },
  "Yemen": { fr: "Yémen", es: "Yemen", de: "Jemen", pt: "Iêmen", it: "Yemen", ar: "اليمن" },
  "Bolivia": { fr: "Bolivie", es: "Bolivia", de: "Bolivien", pt: "Bolívia", it: "Bolivia", ar: "بوليفيا" },
  "Costa Rica": { fr: "Costa Rica", es: "Costa Rica", de: "Costa Rica", pt: "Costa Rica", it: "Costa Rica", ar: "كوستاريكا" },
  "Dominican Republic": { fr: "République dominicaine", es: "República Dominicana", de: "Dominikanische Republik", pt: "República Dominicana", it: "Repubblica Dominicana", ar: "جمهورية الدومينيكان" },
  "Ecuador": { fr: "Équateur", es: "Ecuador", de: "Ecuador", pt: "Equador", it: "Ecuador", ar: "الإكوادور" },
  "Guatemala": { fr: "Guatemala", es: "Guatemala", de: "Guatemala", pt: "Guatemala", it: "Guatemala", ar: "غواتيمالا" },
  "Haiti": { fr: "Haïti", es: "Haití", de: "Haiti", pt: "Haiti", it: "Haiti", ar: "هايتي" },
  "Honduras": { fr: "Honduras", es: "Honduras", de: "Honduras", pt: "Honduras", it: "Honduras", ar: "هندوراس" },
  "Jamaica": { fr: "Jamaïque", es: "Jamaica", de: "Jamaika", pt: "Jamaica", it: "Giamaica", ar: "جامايكا" },
  "Panama": { fr: "Panama", es: "Panamá", de: "Panama", pt: "Panamá", it: "Panama", ar: "بنما" },
  "Paraguay": { fr: "Paraguay", es: "Paraguay", de: "Paraguay", pt: "Paraguai", it: "Paraguay", ar: "باراغواي" },
  "Uruguay": { fr: "Uruguay", es: "Uruguay", de: "Uruguay", pt: "Uruguai", it: "Uruguay", ar: "أوروغواي" },
  "Venezuela": { fr: "Venezuela", es: "Venezuela", de: "Venezuela", pt: "Venezuela", it: "Venezuela", ar: "فنزويلا" },
  "Angola": { fr: "Angola", es: "Angola", de: "Angola", pt: "Angola", it: "Angola", ar: "أنغولا" },
  "Botswana": { fr: "Botswana", es: "Botsuana", de: "Botswana", pt: "Botsuana", it: "Botswana", ar: "بوتسوانا" },
  "Democratic Republic Of The Congo": { fr: "République démocratique du Congo", es: "República Democrática del Congo", de: "Demokratische Republik Kongo", pt: "República Democrática do Congo", it: "Repubblica Democratica del Congo", ar: "جمهورية الكونغو الديمقراطية" },
  "Ivory Coast (Cote D'Ivoire)": { fr: "Côte d'Ivoire", es: "Costa de Marfil", de: "Elfenbeinküste", pt: "Costa do Marfim", it: "Costa d'Avorio", ar: "ساحل العاج" },
  "Cote D'Ivoire (Ivory Coast)": { fr: "Côte d'Ivoire", es: "Costa de Marfil", de: "Elfenbeinküste", pt: "Costa do Marfim", it: "Costa d'Avorio", ar: "ساحل العاج" },
  "Mauritius": { fr: "Maurice", es: "Mauricio", de: "Mauritius", pt: "Maurício", it: "Mauritius", ar: "موريشيوس" },
  "Mozambique": { fr: "Mozambique", es: "Mozambique", de: "Mosambik", pt: "Moçambique", it: "Mozambico", ar: "موزمبيق" },
  "Namibia": { fr: "Namibie", es: "Namibia", de: "Namibia", pt: "Namíbia", it: "Namibia", ar: "ناميبيا" },
  "Rwanda": { fr: "Rwanda", es: "Ruanda", de: "Ruanda", pt: "Ruanda", it: "Ruanda", ar: "رواندا" },
  "Sudan": { fr: "Soudan", es: "Sudán", de: "Sudan", pt: "Sudão", it: "Sudan", ar: "السودان" },
  "Uganda": { fr: "Ouganda", es: "Uganda", de: "Uganda", pt: "Uganda", it: "Uganda", ar: "أوغندا" },
  "Zambia": { fr: "Zambie", es: "Zambia", de: "Sambia", pt: "Zâmbia", it: "Zambia", ar: "زامبيا" },
  "Zimbabwe": { fr: "Zimbabwe", es: "Zimbabue", de: "Simbabwe", pt: "Zimbábue", it: "Zimbabwe", ar: "زيمبابوي" },
};

/** Map of country English names to ISO 3166-1 alpha-2 codes for flag emoji generation */
const COUNTRY_ISO: Record<string, string> = {
  "Afghanistan": "AF", "Albania": "AL", "Algeria": "DZ", "Andorra": "AD", "Angola": "AO",
  "Argentina": "AR", "Armenia": "AM", "Australia": "AU", "Austria": "AT", "Azerbaijan": "AZ",
  "Bahrain": "BH", "Bangladesh": "BD", "Belarus": "BY", "Belgium": "BE", "Benin": "BJ",
  "Bolivia": "BO", "Bosnia And Herzegovina": "BA", "Botswana": "BW", "Brazil": "BR",
  "Bulgaria": "BG", "Burkina Faso": "BF", "Cambodia": "KH", "Cameroon": "CM", "Canada": "CA",
  "Chad": "TD", "Chile": "CL", "China": "CN", "Colombia": "CO", "Congo": "CG",
  "Costa Rica": "CR", "Croatia": "HR", "Cuba": "CU", "Cyprus": "CY", "Czech Republic": "CZ",
  "Democratic Republic Of The Congo": "CD", "Denmark": "DK", "Dominican Republic": "DO",
  "Ecuador": "EC", "Egypt": "EG", "Estonia": "EE", "Ethiopia": "ET", "Finland": "FI",
  "France": "FR", "Gabon": "GA", "Georgia": "GE", "Germany": "DE", "Ghana": "GH",
  "Greece": "GR", "Guatemala": "GT", "Guinea": "GN", "Haiti": "HT", "Honduras": "HN",
  "Hungary": "HU", "Iceland": "IS", "India": "IN", "Indonesia": "ID", "Iran": "IR",
  "Iraq": "IQ", "Ireland": "IE", "Israel": "IL", "Italy": "IT",
  "Ivory Coast": "CI", "Ivory Coast (Cote D'Ivoire)": "CI", "Cote D'Ivoire (Ivory Coast)": "CI",
  "Jamaica": "JM", "Japan": "JP", "Jordan": "JO", "Kenya": "KE", "Kosovo": "XK",
  "Kuwait": "KW", "Latvia": "LV", "Lebanon": "LB", "Libya": "LY", "Liechtenstein": "LI",
  "Lithuania": "LT", "Luxembourg": "LU", "Madagascar": "MG", "Malaysia": "MY", "Mali": "ML",
  "Malta": "MT", "Mauritania": "MR", "Mauritius": "MU", "Mexico": "MX", "Moldova": "MD",
  "Monaco": "MC", "Mongolia": "MN", "Montenegro": "ME", "Morocco": "MA", "Mozambique": "MZ",
  "Myanmar": "MM", "Namibia": "NA", "Nepal": "NP", "Netherlands": "NL", "New Zealand": "NZ",
  "Niger": "NE", "Nigeria": "NG", "North Korea": "KP", "North Macedonia": "MK", "Norway": "NO",
  "Oman": "OM", "Pakistan": "PK", "Panama": "PA", "Paraguay": "PY", "Peru": "PE",
  "Philippines": "PH", "Poland": "PL", "Portugal": "PT", "Qatar": "QA", "Romania": "RO",
  "Russia": "RU", "Rwanda": "RW", "San Marino": "SM", "Saudi Arabia": "SA", "Senegal": "SN",
  "Serbia": "RS", "Singapore": "SG", "Slovakia": "SK", "Slovenia": "SI", "South Africa": "ZA",
  "South Korea": "KR", "Spain": "ES", "Sri Lanka": "LK", "Sudan": "SD", "Sweden": "SE",
  "Switzerland": "CH", "Syria": "SY", "Taiwan": "TW", "Tanzania": "TZ", "Thailand": "TH",
  "Togo": "TG", "Tunisia": "TN", "Turkey": "TR", "Uganda": "UG", "Ukraine": "UA",
  "United Arab Emirates": "AE", "United Kingdom": "GB", "United States": "US",
  "United States of America": "US", "Uruguay": "UY", "Uzbekistan": "UZ",
  "Vatican City": "VA", "Venezuela": "VE", "Vietnam": "VN", "Yemen": "YE",
  "Zambia": "ZM", "Zimbabwe": "ZW",
  // CountriesNow alternate names
  "Congo (Kinshasa)": "CD", "Congo (Brazzaville)": "CG",
};

/**
 * Convert an ISO 3166-1 alpha-2 code to a flag emoji.
 * Uses regional indicator symbols: each letter is offset from 'A' (0x41) to 🇦 (0x1F1E6).
 */
const isoToFlag = (iso: string): string => {
  const codePoints = iso
    .toUpperCase()
    .split("")
    .map((c) => 0x1f1e6 + c.charCodeAt(0) - 0x41);
  return String.fromCodePoint(...codePoints);
};

/**
 * Get the flag emoji for a country name. Returns empty string if unknown.
 */
export const countryFlag = (country: string): string => {
  const iso = COUNTRY_ISO[country];
  return iso ? isoToFlag(iso) : "";
};

// City translations (only cities whose name changes between languages)
const CITY_NAMES: Record<string, Partial<Record<AppLocale, string>>> = {
  "London": { fr: "Londres", es: "Londres", de: "London", pt: "Londres", it: "Londra", ar: "لندن" },
  "Brussels": { fr: "Bruxelles", es: "Bruselas", de: "Brüssel", pt: "Bruxelas", it: "Bruxelles", ar: "بروكسل" },
  "Munich": { fr: "Munich", es: "Múnich", de: "München", pt: "Munique", it: "Monaco di Baviera", ar: "ميونيخ" },
  "Vienna": { fr: "Vienne", es: "Viena", de: "Wien", pt: "Viena", it: "Vienna", ar: "فيينا" },
  "Prague": { fr: "Prague", es: "Praga", de: "Prag", pt: "Praga", it: "Praga", ar: "براغ" },
  "Warsaw": { fr: "Varsovie", es: "Varsovia", de: "Warschau", pt: "Varsóvia", it: "Varsavia", ar: "وارسو" },
  "Lisbon": { fr: "Lisbonne", es: "Lisboa", de: "Lissabon", pt: "Lisboa", it: "Lisbona", ar: "لشبونة" },
  "Rome": { fr: "Rome", es: "Roma", de: "Rom", pt: "Roma", it: "Roma", ar: "روما" },
  "Milan": { fr: "Milan", es: "Milán", de: "Mailand", pt: "Milão", it: "Milano", ar: "ميلانو" },
  "Florence": { fr: "Florence", es: "Florencia", de: "Florenz", pt: "Florença", it: "Firenze", ar: "فلورنسا" },
  "Venice": { fr: "Venise", es: "Venecia", de: "Venedig", pt: "Veneza", it: "Venezia", ar: "البندقية" },
  "Naples": { fr: "Naples", es: "Nápoles", de: "Neapel", pt: "Nápoles", it: "Napoli", ar: "نابولي" },
  "Geneva": { fr: "Genève", es: "Ginebra", de: "Genf", pt: "Genebra", it: "Ginevra", ar: "جنيف" },
  "Zurich": { fr: "Zurich", es: "Zúrich", de: "Zürich", pt: "Zurique", it: "Zurigo", ar: "زيوريخ" },
  "Copenhagen": { fr: "Copenhague", es: "Copenhague", de: "Kopenhagen", pt: "Copenhague", it: "Copenaghen", ar: "كوبنهاغن" },
  "Stockholm": { fr: "Stockholm", es: "Estocolmo", de: "Stockholm", pt: "Estocolmo", it: "Stoccolma", ar: "ستوكهولم" },
  "Helsinki": { fr: "Helsinki", es: "Helsinki", de: "Helsinki", pt: "Helsínquia", it: "Helsinki", ar: "هلسنكي" },
  "Athens": { fr: "Athènes", es: "Atenas", de: "Athen", pt: "Atenas", it: "Atene", ar: "أثينا" },
  "Moscow": { fr: "Moscou", es: "Moscú", de: "Moskau", pt: "Moscou", it: "Mosca", ar: "موسكو" },
  "Beijing": { fr: "Pékin", es: "Pekín", de: "Peking", pt: "Pequim", it: "Pechino", ar: "بكين" },
  "Tokyo": { fr: "Tokyo", es: "Tokio", de: "Tokio", pt: "Tóquio", it: "Tokyo", ar: "طوكيو" },
  "Seoul": { fr: "Séoul", es: "Seúl", de: "Seoul", pt: "Seul", it: "Seul", ar: "سيول" },
  "New Delhi": { fr: "New Delhi", es: "Nueva Delhi", de: "Neu-Delhi", pt: "Nova Délhi", it: "Nuova Delhi", ar: "نيودلهي" },
  "Cairo": { fr: "Le Caire", es: "El Cairo", de: "Kairo", pt: "Cairo", it: "Il Cairo", ar: "القاهرة" },
  "Mexico City": { fr: "Mexico", es: "Ciudad de México", de: "Mexiko-Stadt", pt: "Cidade do México", it: "Città del Messico", ar: "مدينة مكسيكو" },
  "Algiers": { fr: "Alger", es: "Argel", de: "Algier", pt: "Argel", it: "Algeri", ar: "الجزائر العاصمة" },
  "Tunis": { fr: "Tunis", es: "Túnez", de: "Tunis", pt: "Tunes", it: "Tunisi", ar: "تونس العاصمة" },
  "Rabat": { fr: "Rabat", es: "Rabat", de: "Rabat", pt: "Rabat", it: "Rabat", ar: "الرباط" },
  "Casablanca": { fr: "Casablanca", es: "Casablanca", de: "Casablanca", pt: "Casablanca", it: "Casablanca", ar: "الدار البيضاء" },
  "Marrakech": { fr: "Marrakech", es: "Marrakech", de: "Marrakesch", pt: "Marrakech", it: "Marrakech", ar: "مراكش" },
  "Dakar": { fr: "Dakar", es: "Dakar", de: "Dakar", pt: "Dacar", it: "Dakar", ar: "داكار" },
  "Abidjan": { fr: "Abidjan", es: "Abiyán", de: "Abidjan", pt: "Abidjan", it: "Abidjan", ar: "أبيدجان" },
  "Bucharest": { fr: "Bucarest", es: "Bucarest", de: "Bukarest", pt: "Bucareste", it: "Bucarest", ar: "بوخارست" },
  "Budapest": { fr: "Budapest", es: "Budapest", de: "Budapest", pt: "Budapeste", it: "Budapest", ar: "بودابست" },
  "Edinburgh": { fr: "Édimbourg", es: "Edimburgo", de: "Edinburgh", pt: "Edimburgo", it: "Edimburgo", ar: "إدنبرة" },
  "Seville": { fr: "Séville", es: "Sevilla", de: "Sevilla", pt: "Sevilha", it: "Siviglia", ar: "إشبيلية" },
  "Barcelona": { fr: "Barcelone", es: "Barcelona", de: "Barcelona", pt: "Barcelona", it: "Barcellona", ar: "برشلونة" },
  "Marseille": { fr: "Marseille", es: "Marsella", de: "Marseille", pt: "Marselha", it: "Marsiglia", ar: "مرسيليا" },
  "Cologne": { fr: "Cologne", es: "Colonia", de: "Köln", pt: "Colônia", it: "Colonia", ar: "كولونيا" },
  "Antwerp": { fr: "Anvers", es: "Amberes", de: "Antwerpen", pt: "Antuérpia", it: "Anversa", ar: "أنتويرب" },
  "The Hague": { fr: "La Haye", es: "La Haya", de: "Den Haag", pt: "Haia", it: "L'Aia", ar: "لاهاي" },
  "Kyiv": { fr: "Kiev", es: "Kiev", de: "Kiew", pt: "Kiev", it: "Kiev", ar: "كييف" },
  "Istanbul": { fr: "Istanbul", es: "Estambul", de: "Istanbul", pt: "Istambul", it: "Istanbul", ar: "إسطنبول" },
  "Ankara": { fr: "Ankara", es: "Ankara", de: "Ankara", pt: "Ancara", it: "Ankara", ar: "أنقرة" },
  "Riyadh": { fr: "Riyad", es: "Riad", de: "Riad", pt: "Riade", it: "Riad", ar: "الرياض" },
  "Dubai": { fr: "Dubaï", es: "Dubái", de: "Dubai", pt: "Dubai", it: "Dubai", ar: "دبي" },
  "Addis Ababa": { fr: "Addis-Abeba", es: "Adís Abeba", de: "Addis Abeba", pt: "Adis Abeba", it: "Addis Abeba", ar: "أديس أبابا" },
  "Nairobi": { fr: "Nairobi", es: "Nairobi", de: "Nairobi", pt: "Nairóbi", it: "Nairobi", ar: "نيروبي" },
  "Johannesburg": { fr: "Johannesburg", es: "Johannesburgo", de: "Johannesburg", pt: "Joanesburgo", it: "Johannesburg", ar: "جوهانسبرغ" },
  "Cape Town": { fr: "Le Cap", es: "Ciudad del Cabo", de: "Kapstadt", pt: "Cidade do Cabo", it: "Città del Capo", ar: "كيب تاون" },
};

const STORAGE_KEY = "preferred-language";

/** Get the user's preferred language (defaults to "fr") */
export const getPreferredLanguage = (): AppLocale => {
  try {
    const stored = localStorage.getItem(STORAGE_KEY);
    if (stored && AVAILABLE_LANGUAGES.some(l => l.code === stored)) {
      return stored as AppLocale;
    }
  } catch {}
  return "fr";
};

/** Set the preferred language */
export const setPreferredLanguage = (locale: AppLocale) => {
  localStorage.setItem(STORAGE_KEY, locale);
};

/**
 * Localize a country name to the user's preferred language, with flag emoji.
 * Falls back to the original name if no translation found.
 */
export const localizeCountry = (country: string, locale?: AppLocale): string => {
  const lang = locale ?? getPreferredLanguage();
  const flag = countryFlag(country);
  const name = lang === "en" ? country : (COUNTRY_NAMES[country]?.[lang] ?? country);
  return flag ? `${flag} ${name}` : name;
};

/**
 * Localize a city name to the user's preferred language.
 * Falls back to the original name if no translation found.
 */
export const localizeCity = (city: string, locale?: AppLocale): string => {
  const lang = locale ?? getPreferredLanguage();
  if (lang === "en") return city;
  const translations = CITY_NAMES[city];
  return translations?.[lang] ?? city;
};

/**
 * Shorthand: localize both city and country, returned as "City, Country".
 */
export const localizeGeo = (city: string | null, country: string, locale?: AppLocale): string => {
  const lang = locale ?? getPreferredLanguage();
  const localizedCountry = localizeCountry(country, lang);
  if (!city) return localizedCountry;
  const localizedCity = localizeCity(city, lang);
  return `${localizedCity}, ${localizedCountry}`;
};

/**
 * Localize a route string like "Paris → London" 
 */
export const localizeRoute = (
  depCity: string | null,
  arrCity: string,
  locale?: AppLocale
): string => {
  const lang = locale ?? getPreferredLanguage();
  const dep = depCity ? localizeCity(depCity, lang) : "—";
  const arr = localizeCity(arrCity, lang);
  return `${dep} → ${arr}`;
};
