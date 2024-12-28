
import { gatherInteractionContext } from "./collection";
import { setupPerformanceListener } from "./performance";
export const getFiberFromElement = (element: Element): any | null => {
  if ('__REACT_DEVTOOLS_GLOBAL_HOOK__' in window) {
    // @ts-expect-error
    const { renderers } = window.__REACT_DEVTOOLS_GLOBAL_HOOK__;
    if (!renderers) return null;
    // @ts-expect-error
    for (const [, renderer] of Array.from(renderers)) {
      try {
        const fiber = renderer.findFiberByHostInstance(element);
        if (fiber) return fiber;
      } catch (e) {
        // If React is mid-render, references to previous nodes may disappear
      }
    }
  }

  if ('_reactRootContainer' in element) {
    const elementWithRoot = element as unknown as any;
    const rootContainer = elementWithRoot._reactRootContainer;
    return rootContainer?._internalRoot?.current?.child ?? null;
  }

  for (const key in element) {
    if (
      key.startsWith('__reactInternalInstance$') ||
      key.startsWith('__reactFiber')
    ) {
      const elementWithFiber = element as unknown as any;
      return elementWithFiber[key];
    }
  }
  return null;
};

const ClassComponentTag = 1;
const ForwardRefTag = 11;
const FunctionComponentTag = 0;
const MemoComponentTag = 14;
const SimpleMemoComponentTag = 15;
const HostHoistableTag = 26;
const HostSingletonTag = 27;

const isCompositeFiber = (fiber) => fiber.tag === FunctionComponentTag || fiber.tag === ClassComponentTag || fiber.tag === SimpleMemoComponentTag || fiber.tag === MemoComponentTag || fiber.tag === ForwardRefTag;
const isHostFiber = (fiber) => fiber.tag === 5 || 
fiber.tag === HostHoistableTag || 
fiber.tag === HostSingletonTag;
export const getParentCompositeFiber = (fiber: any) => {
  let curr: any | null = fiber;
  let prevNonHost = null;

  while (curr) {
    if (isCompositeFiber(curr)) {
      return [curr, prevNonHost] as const;
    }
    if (isHostFiber(curr)) {
      prevNonHost = curr;
    }
    curr = curr.return;
  }
};
export const getNearestFiberFromElement = (element: Element | null): any | null => {
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

const handleMouseover = (event: Event) => {
  if (!(event.target instanceof Element)) return;
  currentMouseOver = event.target;
};
let currentMouseOver: Element;
document.addEventListener('mouseover', handleMouseover);
setupPerformanceListener((entry) => {
  
  const target =
  entry.target ?? (entry.type === 'pointer' ? currentMouseOver : null);
if (!target) {
  // most likely an invariant that we should log if its violated
  return;
}
  const start = performance.now()
  gatherInteractionContext(
    getNearestFiberFromElement(target),
    target,
    window.location.pathname,
  ).then((data) => {
    console.log('data', data);
    console.log('took', performance.now() - start, 'ms');
  });
})