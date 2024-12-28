
/**
 * 
 * Note
 */
const getType = (type: any) => {
  if (typeof type === "function") {
    return type;
  }
  if (typeof type === "object" && type) {
    return getType(type.type || type.render);
  }
  return null;
};
const getDisplayName = (type: any) => {
  if (typeof type !== "function" && !(typeof type === "object" && type)) {
    return null;
  }
  const name = type.displayName || type.name || null;
  if (name) return name;
  type = getType(type);
  if (!type) return null;
  return type.displayName || type.name || null;
};

export interface DOMRectPartial {
  top: number;
  left: number;
  width: number;
  height: number;
}

export interface HostElementInfo {
  tagName: string;
  textContentHash?: string;
  ariaAttributes?: Record<string, string>;
  dataAttributes?: Record<string, string>;
  style?: Record<string, string>;
  boundingBox?: DOMRectPartial;
}

export interface AncestorNodeInfo {
  fiberType: 'host' | 'component';
  componentName?: string;
  key?: string;
  eventHandlerProps: string[];
  hostElementInfo?: HostElementInfo;
}

export interface InteractionContext {
  route?: string;
  ancestors: AncestorNodeInfo[];
  interactedContent?: {
    text?: string;
    svgContent?: string;
    componentName?: string;
  };
}

export const batchGetBoundingRects = (
  elements: Array<Element>,
): Promise<Map<Element, DOMRect>> => {
  return new Promise((resolve) => {
    const results = new Map<Element, DOMRect>();
    const observer = new IntersectionObserver((entries) => {
      for (const entry of entries) {
        const element = entry.target as Element;
        const bounds = entry.boundingClientRect;
        results.set(element, bounds);
      }
      observer.disconnect();
      resolve(results);
    });

    for (const element of elements) {
      observer.observe(element);
    }
  });
};

function hashText(text: string): string {
  // not hashing for now
  // return hash32(text).toString();
  return text;
}

function isHostFiber(fiber: any): boolean {
  return fiber?.tag === 5 && fiber.stateNode instanceof Element;
}

function extractEventHandlerProps(props: any): string[] {
  if (!props || typeof props !== 'object') return [];
  return Object.keys(props).filter((key) => /^on[A-Z]/.test(key));
}

function extractAriaAttributes(element: HTMLElement): Record<string, string> {
  const aria: Record<string, string> = {};
  for (let i = 0; i < element.attributes.length; i++) {
    const attr = element.attributes[i];
    if (attr.name.startsWith('aria-')) {
      aria[attr.name] = attr.value;
    }
  }
  return aria;
}

function extractDataAttributes(element: HTMLElement): Record<string, string> {
  const dataAttrs: Record<string, string> = {};
  for (let i = 0; i < element.attributes.length; i++) {
    const attr = element.attributes[i];
    if (attr.name.startsWith('data-')) {
      dataAttrs[attr.name] = attr.value;
    }
  }
  return dataAttrs;
}

const IMPORTANT_STYLE_PROPS = [
  'display',
  'position',
  'color',
  'background-color',
  'font-size',
  'font-weight',
  'text-transform',
  'border',
  'margin',
  'padding',
];

function extractSelectedStyles(element: HTMLElement): Record<string, string> {
  const styleMap: Record<string, string> = {};
  try {
    const computed = window.getComputedStyle(element);
    for (const prop of IMPORTANT_STYLE_PROPS) {
      styleMap[prop] = computed.getPropertyValue(prop);
    }
  } catch {
  }
  return styleMap;
}


function gatherHostElementInfo(fiber: any): HostElementInfo {
  const el = fiber.stateNode as HTMLElement;
  const tagName = el.tagName.toLowerCase();

  const textContent = el.textContent?.trim() || '';
  const textContentHash = textContent ? hashText(textContent) : undefined;

  const ariaAttributes = extractAriaAttributes(el);
  const dataAttributes = extractDataAttributes(el);
  const style = extractSelectedStyles(el);

  return {
    tagName,
    textContentHash,
    ariaAttributes: Object.keys(ariaAttributes).length
      ? ariaAttributes
      : undefined,
    dataAttributes: Object.keys(dataAttributes).length
      ? dataAttributes
      : undefined,
    style: Object.keys(style).length ? style : undefined,
  };
}


export async function gatherInteractionContext(
  fiber: any,
  element: any,
  route?: string,
): Promise<InteractionContext> {
  let interactedContent;
  if (element instanceof HTMLElement) {
    const content: InteractionContext['interactedContent'] = {};
    
    const text = element.textContent?.trim();
    if (text) {
      content.text = text;
    }

    const svg = element.querySelector('svg') || (element.tagName === 'SVG' ? element : null);
    if (svg) {
      content.svgContent = svg.outerHTML;
    }

    if (Object.keys(content).length > 0) {
      interactedContent = content;
    }
  }

  const chain: any[] = [];

  let current: any = fiber;
  while (current) {
    chain.push(current);
    current = current.return;
  }

  const ancestors: AncestorNodeInfo[] = [];

  const domElements: HTMLElement[] = [];

  for (const f of chain) {
    const nodeInfo: AncestorNodeInfo = {
      fiberType: isHostFiber(f) ? 'host' : 'component',
      eventHandlerProps: extractEventHandlerProps(f.memoizedProps),
    };

    if (!isHostFiber(f)) {
      const { type, key } = f;
      const name = (getDisplayName(type) || '').trim();
      if (name) {
        nodeInfo.componentName = name;
      }
      if (typeof key === 'string' && key.length < 50 && !/^\d+$/.test(key)) {
        nodeInfo.key = key;
      }
    } else {
      nodeInfo.hostElementInfo = gatherHostElementInfo(f);

      const el = f.stateNode as HTMLElement;
      if (el instanceof HTMLElement) {
        domElements.push(el);
      }
    }

    ancestors.push(nodeInfo);
  }

  if (domElements.length > 0) {
    const boundingMap = await batchGetBoundingRects(domElements);

    let domIndex = 0;
    for (let i = 0; i < ancestors.length; i++) {
      const a = ancestors[i];
      if (a.fiberType === 'host' && a.hostElementInfo) {
        const el = domElements[domIndex];
        domIndex++;
        const rect = boundingMap.get(el);
        if (rect) {
          a.hostElementInfo.boundingBox = {
            top: rect.top,
            left: rect.left,
            width: rect.width,
            height: rect.height,
          };
        }
      }
    }
  }

  return {
    route,
    ancestors,
    ...(interactedContent && { interactedContent }),
  };
}
function hash32(str: string): number {
  let h1 = 0x811c9dc5;
  const c1 = 0xcc9e2d51;
  const c2 = 0x1b873593;
  const len = str.length;

  for (let i = 0; i < len; i++) {
    let k1 = str.charCodeAt(i);

    k1 = (k1 & 0xffff) * c1 + ((((k1 >>> 16) * c1) & 0xffff) << 16);
    k1 = (k1 << 15) | (k1 >>> 17);
    k1 = (k1 & 0xffff) * c2 + ((((k1 >>> 16) * c2) & 0xffff) << 16);

    h1 ^= k1;
    h1 = (h1 << 13) | (h1 >>> 19);
    h1 = h1 * 5 + 0xe6546b64;
  }

  h1 ^= len;
  h1 ^= h1 >>> 16;
  h1 =
    (h1 & 0xffff) * 0x85ebca6b + ((((h1 >>> 16) * 0x85ebca6b) & 0xffff) << 16);
  h1 ^= h1 >>> 13;
  h1 =
    (h1 & 0xffff) * 0xc2b2ae35 + ((((h1 >>> 16) * 0xc2b2ae35) & 0xffff) << 16);
  h1 ^= h1 >>> 16;

  return h1 >>> 0;
}
