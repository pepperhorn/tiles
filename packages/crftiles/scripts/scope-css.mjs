// PostCSS plugin: confines the whole stylesheet (Tailwind theme + preflight + utilities, the app's brutalist rules and the
// embed's own rules) to one root class, so nothing leaks into the host page and the host's element rules don't reach in.
//
// - `:root`, `:host`, `html`, `body` (alone or as the first compound, e.g. `:root[data-chrome=full]`) become the root
//   element itself: `.crftiles`, `.crftiles[data-chrome=full]`.
// - `*` also matches the root (`.crftiles, .crftiles *`), so preflight's box-sizing/margin reset covers it.
// - Every other selector gets a descendant prefix: `.flex` -> `.crftiles .flex`.
// - Cascade layers are unwrapped in source order (theme, base, components, utilities, then unlayered). The app relies on
//   its unlayered brutalist rules beating Tailwind's layered utilities; with everything unlayered and the brutalist rules
//   last, equal-specificity ties resolve the same way. Unlayered also means a host's layered CSS (e.g. its own Tailwind
//   preflight in `@layer base`) can never outrank the embed.
// - `@keyframes` are renamed `<root>-<name>` (and `animation*` / `--animate-*` values follow).
// - Remote font imports (fonts.googleapis.com) are dropped: fonts ship as @fontsource imports (scripts/finalize-css.mjs).
// `@property` rules stay global (they can't be scoped); they only register Tailwind's `--tw-*` custom properties.

const ROOT_SELECTOR = /^(?::root|:host|html|body)(?![\w-])/;

/**
 * @param {{ root: string, include?: RegExp }} opts `root`: class name without the dot; `include`: only stylesheets whose
 * file path matches are scoped (the package's own src/styles.css), so a demo page's or a font's CSS is left alone.
 */
export default function scopeCss({ root, include }) {
  const scope = `.${root}`;
  const scopeSelector = (sel) => {
    const s = sel.trim();
    if (s === scope || s.startsWith(`${scope}.`) || s.startsWith(`${scope}[`) || s.startsWith(`${scope}:`) || s.startsWith(`${scope} `) || s.startsWith(`${scope}>`)) return [s];
    if (ROOT_SELECTOR.test(s)) return [s.replace(ROOT_SELECTOR, scope)];
    if (s === '*') return [scope, `${scope} *`];
    if (/^::?[\w-]+(\([^)]*\))?$/.test(s) && s.startsWith('::')) return [`${scope}${s}`, `${scope} *${s}`];
    return [`${scope} ${s}`];
  };
  return {
    postcssPlugin: 'crftiles-scope',
    Once(css) {
      if (include && !include.test(css.source?.input.file ?? '')) return;
      // Remote font imports would bypass the host's CSP and the bundled fonts.
      css.walkAtRules('import', rule => { if (/fonts\.googleapis\.com/.test(rule.params)) rule.remove(); });
      // Unwrap layers (keep their contents in place) and drop `@layer a, b;` order statements.
      let again = true;
      while (again) {
        again = false;
        css.walkAtRules('layer', rule => {
          if (rule.nodes) rule.replaceWith(rule.nodes); else rule.remove();
          again = true;
        });
      }
      const renamed = new Map();
      css.walkAtRules(/^(-webkit-)?keyframes$/, rule => {
        const name = rule.params.trim();
        if (!name.startsWith(`${root}-`)) { renamed.set(name, `${root}-${name}`); rule.params = `${root}-${name}`; }
      });
      if (renamed.size) {
        const word = new RegExp(`(^|[\\s,])(${[...renamed.keys()].map(n => n.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')).join('|')})(?=$|[\\s,;])`, 'g');
        css.walkDecls(/^(animation(-name)?|--animate-[\w-]+)$/, decl => {
          decl.value = decl.value.replace(word, (_, pre, name) => `${pre}${renamed.get(name)}`);
        });
      }
      css.walkRules(rule => {
        if (rule.parent?.type === 'atrule' && /keyframes$/.test(rule.parent.name)) return;
        rule.selectors = [...new Set(rule.selectors.flatMap(scopeSelector))];
      });
    },
  };
}
scopeCss.postcss = true;
