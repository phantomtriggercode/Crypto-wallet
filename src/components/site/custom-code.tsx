"use client";

import { useEffect } from "react";

// Admin-authored code (SEO verification tags, analytics snippets) can include a mix of
// <meta>/<link>/<script> tags. Elements set via innerHTML never execute embedded <script>
// tags, so each node is walked and any <script> is recreated via createElement to run.
function injectHtml(target: HTMLElement, html: string) {
  const wrapper = document.createElement("div");
  wrapper.innerHTML = html;
  for (const node of Array.from(wrapper.childNodes)) {
    if (node.nodeName === "SCRIPT") {
      const source = node as HTMLScriptElement;
      const script = document.createElement("script");
      for (const attr of Array.from(source.attributes)) script.setAttribute(attr.name, attr.value);
      script.text = source.text;
      target.appendChild(script);
    } else {
      target.appendChild(node.cloneNode(true));
    }
  }
}

export function CustomCode({ head, bodyEnd }: { head: string; bodyEnd: string }) {
  useEffect(() => {
    const inserted: ChildNode[] = [];
    if (head.trim()) {
      const before = new Set(Array.from(document.head.childNodes));
      injectHtml(document.head, head);
      for (const node of Array.from(document.head.childNodes)) if (!before.has(node)) inserted.push(node);
    }
    if (bodyEnd.trim()) {
      const before = new Set(Array.from(document.body.childNodes));
      injectHtml(document.body, bodyEnd);
      for (const node of Array.from(document.body.childNodes)) if (!before.has(node)) inserted.push(node);
    }
    return () => {
      for (const node of inserted) node.parentNode?.removeChild(node);
    };
  }, [head, bodyEnd]);

  return null;
}
