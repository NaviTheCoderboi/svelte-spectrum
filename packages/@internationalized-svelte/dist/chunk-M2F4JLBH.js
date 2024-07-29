// src/LocalizedStringDictionary.ts
var localeSymbol = Symbol.for("svelte-aria.i18n.locale");
var stringsSymbol = Symbol.for("svelte-aria.i18n.strings");
var cachedGlobalStrings = void 0;
var LocalizedStringDictionary = class _LocalizedStringDictionary {
  strings;
  defaultLocale;
  constructor(messages, defaultLocale = "en-US") {
    this.strings = Object.fromEntries(Object.entries(messages).filter(([, v]) => v));
    this.defaultLocale = defaultLocale;
  }
  getStringForLocale(key, locale) {
    const strings = this.getStringsForLocale(locale);
    const string = strings[key];
    if (!string) {
      throw new Error(`Could not find intl message ${key} in ${locale} locale`);
    }
    return string;
  }
  getStringsForLocale(locale) {
    let strings = this.strings[locale];
    if (!strings) {
      strings = getStringsForLocale(locale, this.strings, this.defaultLocale);
      this.strings[locale] = strings;
    }
    return strings;
  }
  static getGlobalDictionaryForPackage(packageName) {
    if (typeof window === "undefined") {
      return null;
    }
    const locale = window[localeSymbol];
    if (cachedGlobalStrings === void 0) {
      const globalStrings = window[stringsSymbol];
      if (!globalStrings) {
        return null;
      }
      cachedGlobalStrings = {};
      for (const pkg in globalStrings) {
        cachedGlobalStrings[pkg] = new _LocalizedStringDictionary(
          { [locale]: globalStrings[pkg] },
          locale
        );
      }
    }
    const dictionary = cachedGlobalStrings?.[packageName];
    if (!dictionary) {
      throw new Error(
        `Strings for package "${packageName}" were not included by LocalizedStringProvider. Please add it to the list passed to createLocalizedStringDictionary.`
      );
    }
    return dictionary;
  }
};
function getStringsForLocale(locale, strings, defaultLocale = "en-US") {
  if (strings[locale]) {
    return strings[locale];
  }
  const language = getLanguage(locale);
  if (strings[language]) {
    return strings[language];
  }
  for (const key in strings) {
    if (key.startsWith(language + "-")) {
      return strings[key];
    }
  }
  return strings[defaultLocale];
}
function getLanguage(locale) {
  if (Intl.Locale) {
    return new Intl.Locale(locale).language;
  }
  return locale.split("-")[0];
}

export {
  LocalizedStringDictionary
};
