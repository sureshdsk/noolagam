import { DOMParser, parseHTML } from "linkedom";

export interface DomElement {
  tagName: string;
  textContent: string | null;
  children: DomElement[];
  getAttribute(name: string): string | null;
  getElementsByTagName(tag: string): DomElement[];
  querySelector(selector: string): DomElement | null;
  querySelectorAll(selector: string): DomElement[];
}

export interface DomDocument {
  documentElement: DomElement | null;
  body: DomElement | null;
  getElementsByTagName(tag: string): DomElement[];
  querySelector(selector: string): DomElement | null;
}

interface DomWindow {
  document: DomDocument;
}

export interface ManifestItem {
  id: string;
  path: string;
  mediaType: string;
  properties: string;
}

export function parseHtml(html: string): DomDocument {
  return (parseHTML(html) as unknown as DomWindow).document;
}

export function parseXml(xml: string): DomDocument {
  return new DOMParser().parseFromString(xml, "text/xml") as unknown as DomDocument;
}
