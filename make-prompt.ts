import { json } from './undo-button';
// import {json}
export function genPrompt(context: any): string {
  return `
You have JSON describing a user's click on a UI element in a React-based application. 
An optional field, "interactedContent", may contain:
- \`text\`: textual content from the clicked element,
- \`svgContent\`: raw SVG markup (if the element is an SVG or includes an icon),
- \`componentName\`: a name derived from the element (if present).

### Required Output

Produce a concise summary (bullets or minimal paragraphs) addressing:

1. **Domain-Level Hierarchy**  
   - List each domain-relevant component from outer to the clicked element,
     skipping library wrappers in the middle. 
   - If the final clicked element has no domain-level name, refer to it as “the clicked host element” (plus style/bounding box notes).
   - For each domain-level component, add short parenthesized style or bounding box notes if relevant (e.g., "(white panel, center)").

2. **Event Handler Logic**  
   - Identify which domain-level component (if any) sets onClick, onValueChange, etc.
   - If only library wrappers have an event, note it as pass-through.
   - No contradictions (don’t say “X sets onClick” then “no domain-level event handler”).

3. **Layout / BBox**  
   - Convert bounding box or style to short user-friendly references, e.g. “~40px wide, near top-left.”
   - Avoid raw numeric dumps.

4. **Data Attributes**  
   - Only list actual data-* attributes from the JSON (no invention).
   - If none appear, omit them.

5. **Interacted Content**  
   - If \`interactedContent.text\` is present, briefly mention it or interpret it (e.g., “The button label reads: ‘Submit’”).
   - If \`interactedContent.svgContent\` is present, attempt a short interpretation (e.g., “An arrow icon,” “A checkmark shape”), but do not guess beyond the provided markup. 
   - If \`interactedContent.componentName\` is provided, mention it (e.g., “componentName='SomeIcon'”).
   - Summarize this content in 1–2 lines, avoiding speculation not supported by data.

6. **No Filler**  
   - No disclaimers like “Skipping library wrappers…” 
   - Just present the domain-level path, event handlers, minimal style/bbox, real data attributes, and a short mention of \`interactedContent\`.

### Example
- **Hierarchy**:
  1) **DomainModuleA (dark background)**
  2) **DomainModuleB (white panel, center)**
  3) **the clicked host element (top-right, ~40px wide)**

- **Event Handlers**:
  "DomainModuleB sets onValueChange. Library wrappers mention onClick, pass-through only."

- **Layout**:
  "Clicked element is near top-right, ~40px wide."

- **Data Attributes**:
  "data-feature='someFeatureAction'"

- **Interacted Content**:
  - text: "Confirm"
  - componentName: "ConfirmButton"

### JSON Data
\`\`\`json
${JSON.stringify(context, null, 2)}
\`\`\`
`;
}

console.log(genPrompt(json));
