var ReactInteractionTracker = (() => {
  var __defProp = Object.defineProperty;
  var __getOwnPropDesc = Object.getOwnPropertyDescriptor;
  var __getOwnPropNames = Object.getOwnPropertyNames;
  var __hasOwnProp = Object.prototype.hasOwnProperty;
  var __export = (target, all) => {
    for (var name in all)
      __defProp(target, name, { get: all[name], enumerable: true });
  };
  var __copyProps = (to, from, except, desc) => {
    if (from && typeof from === "object" || typeof from === "function") {
      for (let key of __getOwnPropNames(from))
        if (!__hasOwnProp.call(to, key) && key !== except)
          __defProp(to, key, { get: () => from[key], enumerable: !(desc = __getOwnPropDesc(from, key)) || desc.enumerable });
    }
    return to;
  };
  var __toCommonJS = (mod) => __copyProps(__defProp({}, "__esModule", { value: true }), mod);

  // index.ts
  var index_exports = {};
  __export(index_exports, {
    getFiberFromElement: () => getFiberFromElement,
    getNearestFiberFromElement: () => getNearestFiberFromElement,
    getParentCompositeFiber: () => getParentCompositeFiber
  });

  // collection.ts
  var getType = (type) => {
    if (typeof type === "function") {
      return type;
    }
    if (typeof type === "object" && type) {
      return getType(type.type || type.render);
    }
    return null;
  };
  var getDisplayName = (type) => {
    if (typeof type !== "function" && !(typeof type === "object" && type)) {
      return null;
    }
    const name = type.displayName || type.name || null;
    if (name) return name;
    type = getType(type);
    if (!type) return null;
    return type.displayName || type.name || null;
  };
  var batchGetBoundingRects = (elements) => {
    return new Promise((resolve) => {
      const results = /* @__PURE__ */ new Map();
      const observer = new IntersectionObserver((entries) => {
        for (const entry of entries) {
          const element = entry.target;
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
  function hashText(text) {
    return text;
  }
  function isHostFiber(fiber) {
    return fiber?.tag === 5 && fiber.stateNode instanceof Element;
  }
  function extractEventHandlerProps(props) {
    if (!props || typeof props !== "object") return [];
    return Object.keys(props).filter((key) => /^on[A-Z]/.test(key));
  }
  function extractAriaAttributes(element) {
    const aria = {};
    for (let i = 0; i < element.attributes.length; i++) {
      const attr = element.attributes[i];
      if (attr.name.startsWith("aria-")) {
        aria[attr.name] = attr.value;
      }
    }
    return aria;
  }
  function extractDataAttributes(element) {
    const dataAttrs = {};
    for (let i = 0; i < element.attributes.length; i++) {
      const attr = element.attributes[i];
      if (attr.name.startsWith("data-")) {
        dataAttrs[attr.name] = attr.value;
      }
    }
    return dataAttrs;
  }
  var IMPORTANT_STYLE_PROPS = [
    "display",
    "position",
    "color",
    "background-color",
    "font-size",
    "font-weight",
    "text-transform",
    "border",
    "margin",
    "padding"
  ];
  function extractSelectedStyles(element) {
    const styleMap = {};
    try {
      const computed = window.getComputedStyle(element);
      for (const prop of IMPORTANT_STYLE_PROPS) {
        styleMap[prop] = computed.getPropertyValue(prop);
      }
    } catch {
    }
    return styleMap;
  }
  function gatherHostElementInfo(fiber) {
    const el = fiber.stateNode;
    const tagName = el.tagName.toLowerCase();
    const textContent = el.textContent?.trim() || "";
    const textContentHash = textContent ? hashText(textContent) : void 0;
    const ariaAttributes = extractAriaAttributes(el);
    const dataAttributes = extractDataAttributes(el);
    const style = extractSelectedStyles(el);
    return {
      tagName,
      textContentHash,
      ariaAttributes: Object.keys(ariaAttributes).length ? ariaAttributes : void 0,
      dataAttributes: Object.keys(dataAttributes).length ? dataAttributes : void 0,
      style: Object.keys(style).length ? style : void 0
    };
  }
  async function gatherInteractionContext(fiber, element, route) {
    let interactedContent;
    if (element instanceof HTMLElement) {
      const content = {};
      const text = element.textContent?.trim();
      if (text) {
        content.text = text;
      }
      const svg = element.querySelector("svg") || (element.tagName === "SVG" ? element : null);
      if (svg) {
        content.svgContent = svg.outerHTML;
      }
      if (Object.keys(content).length > 0) {
        interactedContent = content;
      }
    }
    const chain = [];
    let current = fiber;
    while (current) {
      chain.push(current);
      current = current.return;
    }
    const ancestors = [];
    const domElements = [];
    for (const f of chain) {
      const nodeInfo = {
        fiberType: isHostFiber(f) ? "host" : "component",
        eventHandlerProps: extractEventHandlerProps(f.memoizedProps)
      };
      if (!isHostFiber(f)) {
        const { type, key } = f;
        const name = (getDisplayName(type) || "").trim();
        if (name) {
          nodeInfo.componentName = name;
        }
        if (typeof key === "string" && key.length < 50 && !/^\d+$/.test(key)) {
          nodeInfo.key = key;
        }
      } else {
        nodeInfo.hostElementInfo = gatherHostElementInfo(f);
        const el = f.stateNode;
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
        if (a.fiberType === "host" && a.hostElementInfo) {
          const el = domElements[domIndex];
          domIndex++;
          const rect = boundingMap.get(el);
          if (rect) {
            a.hostElementInfo.boundingBox = {
              top: rect.top,
              left: rect.left,
              width: rect.width,
              height: rect.height
            };
          }
        }
      }
    }
    return {
      route,
      ancestors,
      ...interactedContent && { interactedContent }
    };
  }

  // performance.ts
  var getInteractionType = (eventName) => {
    if (["pointerdown", "pointerup", "click"].includes(eventName)) {
      return "pointer";
    }
    if (["keydown", "keyup"].includes(eventName)) {
      return "keyboard";
    }
    return null;
  };
  var setupPerformanceListener = (onEntry) => {
    const longestInteractionMap = /* @__PURE__ */ new Map();
    const interactionTargetMap = /* @__PURE__ */ new Map();
    const processInteractionEntry = (entry) => {
      if (!(entry.interactionId || entry.entryType === "first-input")) return;
      if (entry.interactionId && entry.target && !interactionTargetMap.has(entry.interactionId)) {
        interactionTargetMap.set(entry.interactionId, entry.target);
      }
      const existingInteraction = longestInteractionMap.get(entry.interactionId);
      if (existingInteraction) {
        if (entry.duration > existingInteraction.latency) {
          existingInteraction.entries = [entry];
          existingInteraction.latency = entry.duration;
        } else if (entry.duration === existingInteraction.latency && entry.startTime === existingInteraction.entries[0].startTime) {
          existingInteraction.entries.push(entry);
        }
      } else {
        const interactionType = getInteractionType(entry.name);
        if (!interactionType) return;
        const interaction = {
          id: entry.interactionId,
          latency: entry.duration,
          entries: [entry],
          target: entry.target,
          type: interactionType,
          startTime: entry.startTime,
          processingStart: entry.processingStart,
          processingEnd: entry.processingEnd,
          duration: entry.duration,
          inputDelay: entry.processingStart - entry.startTime,
          processingDuration: entry.processingEnd - entry.processingStart,
          presentationDelay: entry.duration - (entry.processingEnd - entry.startTime),
          timestamp: Date.now(),
          // timeSinceTabInactive:
          //   lastVisibilityHiddenAt === 'never-hidden'
          //     ? 'never-hidden'
          //     : Date.now() - lastVisibilityHiddenAt,
          visibilityState: document.visibilityState,
          timeOrigin: performance.timeOrigin,
          referrer: document.referrer
        };
        longestInteractionMap.set(interaction.id, interaction);
        onEntry(interaction);
      }
    };
    const po = new PerformanceObserver((list) => {
      const entries = list.getEntries();
      for (let i = 0, len = entries.length; i < len; i++) {
        const entry = entries[i];
        processInteractionEntry(entry);
      }
    });
    try {
      po.observe({
        type: "event",
        buffered: true,
        durationThreshold: 16
      });
      po.observe({
        type: "first-input",
        buffered: true
      });
    } catch {
    }
    return () => po.disconnect();
  };

  // index.ts
  var getFiberFromElement = (element) => {
    if ("__REACT_DEVTOOLS_GLOBAL_HOOK__" in window) {
      const { renderers } = window.__REACT_DEVTOOLS_GLOBAL_HOOK__;
      if (!renderers) return null;
      for (const [, renderer] of Array.from(renderers)) {
        try {
          const fiber = renderer.findFiberByHostInstance(element);
          if (fiber) return fiber;
        } catch (e) {
        }
      }
    }
    if ("_reactRootContainer" in element) {
      const elementWithRoot = element;
      const rootContainer = elementWithRoot._reactRootContainer;
      return rootContainer?._internalRoot?.current?.child ?? null;
    }
    for (const key in element) {
      if (key.startsWith("__reactInternalInstance$") || key.startsWith("__reactFiber")) {
        const elementWithFiber = element;
        return elementWithFiber[key];
      }
    }
    return null;
  };
  var ClassComponentTag = 1;
  var ForwardRefTag = 11;
  var FunctionComponentTag = 0;
  var MemoComponentTag = 14;
  var SimpleMemoComponentTag = 15;
  var HostHoistableTag = 26;
  var HostSingletonTag = 27;
  var isCompositeFiber = (fiber) => fiber.tag === FunctionComponentTag || fiber.tag === ClassComponentTag || fiber.tag === SimpleMemoComponentTag || fiber.tag === MemoComponentTag || fiber.tag === ForwardRefTag;
  var isHostFiber2 = (fiber) => fiber.tag === 5 || fiber.tag === HostHoistableTag || fiber.tag === HostSingletonTag;
  var getParentCompositeFiber = (fiber) => {
    let curr = fiber;
    let prevNonHost = null;
    while (curr) {
      if (isCompositeFiber(curr)) {
        return [curr, prevNonHost];
      }
      if (isHostFiber2(curr)) {
        prevNonHost = curr;
      }
      curr = curr.return;
    }
  };
  var getNearestFiberFromElement = (element) => {
    if (!element) return null;
    try {
      const fiber = getFiberFromElement(element);
      if (!fiber) return null;
      const res = getParentCompositeFiber(fiber);
      return res ? res[0] : null;
    } catch (error) {
      return null;
    }
  };
  var handleMouseover = (event) => {
    if (!(event.target instanceof Element)) return;
    currentMouseOver = event.target;
  };
  var currentMouseOver;
  document.addEventListener("mouseover", handleMouseover);
  setupPerformanceListener((entry) => {
    const target = entry.target ?? (entry.type === "pointer" ? currentMouseOver : null);
    if (!target) {
      return;
    }
    const start = performance.now();
    gatherInteractionContext(
      getNearestFiberFromElement(target),
      target,
      window.location.pathname
    ).then((data) => {
      console.log("data", data);
      console.log("took", performance.now() - start, "ms");
    });
  });
  return __toCommonJS(index_exports);
})();
