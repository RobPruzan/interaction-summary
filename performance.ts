
const getInteractionType = (
  eventName: string,
): 'pointer' | 'keyboard' | null => {
  if (['pointerdown', 'pointerup', 'click'].includes(eventName)) {
    return 'pointer';
  }
  if (['keydown', 'keyup'].includes(eventName)) {
    return 'keyboard';
  }
  return null;
};
export const setupPerformanceListener = (
  onEntry: (interaction: any) => void,
) => {
  // trackVisibilityChange();
  const longestInteractionMap = new Map<string, any>();
  const interactionTargetMap = new Map<string, Element>();

  const processInteractionEntry = (entry: any) => {
    if (!(entry.interactionId || entry.entryType === 'first-input')) return;

    if (
      entry.interactionId &&
      entry.target &&
      !interactionTargetMap.has(entry.interactionId)
    ) {
      interactionTargetMap.set(entry.interactionId, entry.target);
    }

    const existingInteraction = longestInteractionMap.get(entry.interactionId);

    if (existingInteraction) {
      if (entry.duration > existingInteraction.latency) {
        existingInteraction.entries = [entry];
        existingInteraction.latency = entry.duration;
      } else if (
        entry.duration === existingInteraction.latency &&
        entry.startTime === existingInteraction.entries[0].startTime
      ) {
        existingInteraction.entries.push(entry);
      }
    } else {
      const interactionType = getInteractionType(entry.name);
      if (!interactionType) return;

      const interaction: any = {
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
        presentationDelay:
          entry.duration - (entry.processingEnd - entry.startTime),
        timestamp: Date.now(),
        // timeSinceTabInactive:
        //   lastVisibilityHiddenAt === 'never-hidden'
        //     ? 'never-hidden'
        //     : Date.now() - lastVisibilityHiddenAt,
        visibilityState: document.visibilityState,
        timeOrigin: performance.timeOrigin,
        referrer: document.referrer,
      };
      longestInteractionMap.set(interaction.id, interaction);

      // console.log('interaction', interaction);

      onEntry(interaction);
    }
  };

  const po = new PerformanceObserver((list) => {
    const entries = list.getEntries();
    for (let i = 0, len = entries.length; i < len; i++) {
      const entry = entries[i];
      processInteractionEntry(entry as any);
    }
  });

  try {
    po.observe({
      type: 'event',
      buffered: true,
      durationThreshold: 16,
    } as PerformanceObserverInit);
    po.observe({
      type: 'first-input',
      buffered: true,
    });
  } catch {
    /* Should collect error logs*/
  }

  return () => po.disconnect();
};
