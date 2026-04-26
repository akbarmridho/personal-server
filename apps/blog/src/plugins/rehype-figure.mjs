/**
 * Rehype plugin that wraps <img> with non-empty alt text
 * in <figure> + <figcaption>. No external dependencies.
 */
export default function rehypeFigure() {
  return (tree) => {
    walk(tree);
  };
}

function walk(node) {
  if (!node.children) return;

  for (let i = 0; i < node.children.length; i++) {
    const child = node.children[i];

    if (child.tagName === "p") {
      const meaningful = child.children.filter(
        (c) => !(c.type === "text" && c.value.trim() === ""),
      );

      if (meaningful.length === 1 && meaningful[0].tagName === "img") {
        const img = meaningful[0];
        const alt = img.properties?.alt;
        if (!alt) continue;

        node.children[i] = {
          type: "element",
          tagName: "figure",
          properties: {},
          children: [
            img,
            {
              type: "element",
              tagName: "figcaption",
              properties: {},
              children: [{ type: "text", value: alt }],
            },
          ],
        };
        continue;
      }
    }

    walk(child);
  }
}
