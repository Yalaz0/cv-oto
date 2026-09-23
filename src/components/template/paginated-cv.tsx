"use client";
import { useEffect, useRef, useState } from "react";
import type { CvTemplateDocument } from "@/modules/template/types";
import { CvTemplate } from "./cv-template";
import "./cv-template.css";

export function PaginatedCv({
  document,
  pageLimit = "auto",
  print = false,
}: {
  document: CvTemplateDocument;
  pageLimit: "auto" | 1 | 2 | 3;
  print?: boolean;
}) {
  const source = useRef<HTMLDivElement>(null),
    output = useRef<HTMLDivElement>(null),
    viewport = useRef<HTMLDivElement>(null);
  const [count, setCount] = useState(0),
    [overflow, setOverflow] = useState(false),
    [scale, setScale] = useState(1);
  useEffect(() => {
    const container = viewport.current;
    if (!container || print) return;
    const observer = new ResizeObserver((entries) =>
      setScale(Math.min(1, entries[0].contentRect.width / 794)),
    );
    observer.observe(container);
    return () => observer.disconnect();
  }, [print]);
  // biome-ignore lint/correctness/useExhaustiveDependencies: Re-paginate the rendered source whenever the CV document changes.
  useEffect(() => {
    let disposed = false;
    void globalThis.document.fonts.ready.then(() => {
      if (disposed || !source.current || !output.current) return;
      const original =
        source.current.querySelector<HTMLElement>(".cv-document");
      if (!original) return;
      const target = output.current;
      target.replaceChildren();
      const pages: HTMLElement[] = [];
      let oversized = false;
      const pageAt = (index: number) => {
        if (pages[index]) return pages[index];
        const page = original.cloneNode(true) as HTMLElement;
        page.classList.add("cv-page");
        page.querySelector(".cv-primary")?.replaceChildren();
        page.querySelector(".cv-sidebar")?.replaceChildren();
        target.append(page);
        const content = page.querySelector<HTMLElement>(".cv-content");
        if (content) {
          const height =
            page.clientHeight -
            parseFloat(getComputedStyle(page).paddingBottom) -
            content.offsetTop;
          content.style.height = `${height}px`;
        }
        pages.push(page);
        return page;
      };
      pageAt(0);
      for (const columnName of [".cv-primary", ".cv-sidebar"]) {
        let pageIndex = 0;
        for (const section of original.querySelectorAll(
          `${columnName} > .cv-section`,
        )) {
          const body = Array.from(section.children).filter(
            (child) => child.tagName !== "H2",
          );
          const blocks = body.flatMap((child) =>
            child.tagName === "UL"
              ? Array.from(child.children).map((li) => {
                  const list = child.cloneNode(false);
                  list.appendChild(li.cloneNode(true));
                  return list as Element;
                })
              : [child],
          );
          for (const block of blocks) {
            const chunk = section.cloneNode(false) as HTMLElement;
            const heading = section.querySelector("h2");
            if (heading) chunk.append(heading.cloneNode(true));
            chunk.append(block.cloneNode(true));
            let column =
              pageAt(pageIndex).querySelector<HTMLElement>(columnName);
            if (!column) continue;
            column.append(chunk);
            if (
              column.scrollHeight > column.clientHeight + 1 &&
              column.children.length > 1
            ) {
              chunk.remove();
              pageIndex++;
              column = pageAt(pageIndex).querySelector<HTMLElement>(columnName);
              column?.append(chunk);
            }
            if (column && column.scrollHeight > column.clientHeight + 1)
              oversized = true;
          }
        }
      }
      setCount(pages.length);
      setOverflow(oversized);
      target.dataset.paginationReady = "true";
      target.dataset.overflow = String(oversized);
      target.dataset.pageCount = String(pages.length);
    });
    return () => {
      disposed = true;
    };
  }, [document]);
  return (
    <div ref={viewport} className={print ? "cv-print-view" : "cv-preview-view"}>
      {!print && (
        <p className="p-3 text-sm" role="note">
          {count} A4 sayfa
          {overflow
            ? " · Bir kayıt sayfaya sığmıyor; metni bölün veya kısaltın."
            : pageLimit !== "auto" && count > pageLimit
              ? " · Sayfa sınırı aşıldı; PDF indirilemez."
              : ""}
        </p>
      )}
      <div ref={source} className="cv-measure" aria-hidden="true">
        <CvTemplate document={document} />
      </div>
      <div style={print ? undefined : { zoom: scale }} ref={output} />
    </div>
  );
}
