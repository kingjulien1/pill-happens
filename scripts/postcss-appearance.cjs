/**
 * Resolve authored system-color blocks through the app's single appearance flag.
 * Palette values remain where they are authored/generated; no parallel theme CSS.
 */
module.exports = function appearanceModes() {
  return {
    postcssPlugin: "pill-appearance-modes",
    OnceExit(root, { postcss }) {
      const moduleCss = /\.module\.css(?:$|\?)/.test(
        root.source?.input?.file || "",
      );
      const qualify = (selector, mode, fallback) => {
        const condition = fallback
          ? ":not([data-color-mode])"
          : `[data-color-mode="${mode}"]`;
        // Keep :root's original specificity for generated semantic tokens.
        if (selector.includes(":root"))
          return selector.replace(/:root\b/g, `:root:where(${condition})`);
        const ancestor = `:where(html${condition})`;
        return `${moduleCss ? `:global(${ancestor})` : ancestor} ${selector}`;
      };
      const scope = (container, mode, fallback, nested) => {
        if (nested) {
          const wrapper = postcss.rule({
            selector: qualify("&", mode, fallback),
          });
          wrapper.append(container.nodes);
          container.removeAll().append(wrapper);
          return;
        }
        for (const node of container.nodes || []) {
          if (node.type === "rule") {
            node.selectors = node.selectors.map((selector) =>
              qualify(selector, mode, fallback),
            );
            // Descendant/nested rules inherit the qualified outer selector.
          } else if (node.type === "atrule") scope(node, mode, fallback);
        }
      };
      // Snapshot first; emitted clones must never be transformed recursively.
      const themeBlocks = [];
      root.walkAtRules("media", (rule) => {
        const match = rule.params.match(
          /^\(\s*prefers-color-scheme\s*:\s*(light|dark)\s*\)$/i,
        );
        if (match) {
          let parent = rule.parent;
          while (parent && parent.type !== "rule") parent = parent.parent;
          themeBlocks.push([rule, match[1].toLowerCase(), Boolean(parent)]);
        }
      });
      for (const [rule, mode, nested] of themeBlocks) {
        const manual = rule.clone();
        scope(manual, mode, false, nested);
        scope(rule, mode, true, nested);
        // CSS knows the OS before JS; the prepaint flag takes over atomically.
        rule.after(manual.nodes);
      }
    },
  };
};
module.exports.postcss = true;
