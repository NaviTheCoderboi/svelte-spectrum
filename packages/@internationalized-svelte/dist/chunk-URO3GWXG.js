// src/LocalizedStringFormatter.ts
var pluralRulesCache = /* @__PURE__ */ new Map();
var numberFormatCache = /* @__PURE__ */ new Map();
var LocalizedStringFormatter = class {
  locale;
  strings;
  constructor(locale, strings) {
    this.locale = locale;
    this.strings = strings;
  }
  format(key, variables) {
    const message = this.strings.getStringForLocale(key, this.locale);
    return typeof message === "function" ? message(variables, this) : message;
  }
  plural(count, options, type = "cardinal") {
    let opt = options["=" + count];
    if (opt) {
      return typeof opt === "function" ? opt() : opt;
    }
    const key = this.locale + ":" + type;
    let pluralRules = pluralRulesCache.get(key);
    if (!pluralRules) {
      pluralRules = new Intl.PluralRules(this.locale, { type });
      pluralRulesCache.set(key, pluralRules);
    }
    const selected = pluralRules.select(count);
    opt = options[selected] || options.other;
    return typeof opt === "function" ? opt() : opt;
  }
  number(value) {
    let numberFormat = numberFormatCache.get(this.locale);
    if (!numberFormat) {
      numberFormat = new Intl.NumberFormat(this.locale);
      numberFormatCache.set(this.locale, numberFormat);
    }
    return numberFormat.format(value);
  }
  select(options, value) {
    const opt = options[value] || options.other;
    return typeof opt === "function" ? opt() : opt;
  }
};

export {
  LocalizedStringFormatter
};
