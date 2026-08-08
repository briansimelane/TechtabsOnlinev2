# PDF Export Fix: Text Clipping in UI Cards

## 1. Issue Overview
In the recently improved PDF export function, text elements (specifically Team Names and CEO tags) are getting vertically clipped at the bottom inside their container cards. 
* Affected areas include the "Plan vs Actual Units" cards and the "League" leaderboard rows.

## 2. Technical Context
When rendering HTML/CSS to a canvas for PDF generation (e.g., via `html2canvas`, `jsPDF`, or similar tools), text bounding boxes are often calculated slightly differently than in a live browser DOM. If the parent container has strict vertical constraints, the rendering engine will clip the bottom of the text (especially the descenders).

## 3. Required CSS/Structural Fixes
Please audit the CSS for the components holding the Team Names and CEO tags and apply the following adjustments (these can be scoped specifically to the print/export state if necessary):

*   **Remove Fixed Heights:** Ensure the containers holding the text use `min-height` rather than a strict `height` or `max-height` property.
*   **Adjust Overflow Properties:** Check for `overflow: hidden` on the text wrappers, flex-items, or parent cards. Override this to `overflow: visible` during the PDF generation state.
*   **Increase Padding/Line-Height:** Add a small amount of `padding-bottom` (e.g., `4px`) or slightly increase the `line-height` on the typography elements to give the PDF renderer enough breathing room to draw the full character heights without clipping.