# WBS PDM Class Test - Bug Report & Fix Requests

During a recent live test session for the WBS PDM class, several issues were identified on both the Facilitator and Student views, as well as with the export functionalities. Please investigate and implement fixes for the following items:

## 1. Market Reports Data Sync (State/Period Mismatch)
*   **Issue:** The Market Reports displayed on the Facilitator Dashboard showed different data compared to the Market Reports the students saw on their dashboards after the simulation was advanced to the next period. 
*   **Expected Behavior:** When the simulation is run and advances to the next period, both the Facilitator and Student views should query and display the exact same period data synchronously.

## 2. Supplier Deals - Input Field Resetting (React State Issue)
*   **Issue:** On the Facilitator Dashboard under "Supplier Deals," attempting to change variable inputs (e.g., Price) causes the number to immediately revert back to its initial value as the user types.
*   **Technical Context:** This appears to be a controlled component issue where the active Firebase snapshot listener is overriding the local input state before the update function can trigger. 
*   **Expected Behavior:** The Facilitator should be able to type a new value seamlessly without the input field resetting, updating Firebase only on `onBlur` or via a discrete submit action.

## 3. Real-Time Updates Failing on Student View (Missing Listener)
*   **Issue:** When the Facilitator makes a variable change on the dashboard, it does not immediately reflect on the Student side. Students had to manually refresh their browsers to fetch the updated data.
*   **Technical Context:** It seems the specific components on the student view are missing active `onSnapshot` Firebase listeners and are relying on a one-time data fetch.
*   **Expected Behavior:** Any changes pushed by the Facilitator should immediately trigger a re-render on the Student view via a real-time snapshot listener.

## 4. Market Reports Slides - Responsive Resizing (CSS Issue)
*   **Issue:** In the Student view, the slides under Market Reports do not resize correctly on smaller screens. The outer frame resizes, but the content inside gets squashed and becomes unreadable.
*   **Expected Behavior:** The inner slide content (charts, text, tables) should scale proportionally with the outer container using responsive CSS (e.g., `flex-wrap`, percentage-based widths, or SVG `viewBox` attributes) rather than strict fixed dimensions.

## 5. Marketing Page - Historical Market Share Data Discrepancy
*   **Issue:** On the Student Marketing page (in Year 2 and beyond), the "market share from last year" data fails to display the actual market share sold by the students (both in percentage and in units). This section had to be hidden during the live session. 
*   **Technical Context:** Because the data displays correctly in the Debrief Slides, the simulation engine is calculating this correctly. The Student UI is likely querying the wrong state variable or failing to pull the historical node properly.
*   **Expected Behavior:** The student dashboard should correctly pull and display the exact historical market share (percentage and units) that matches the backend calculations and the Debrief slides for that corresponding period.

## 6. PDF Export Rendering Issues (Timing & Missing Elements)
*   **Issue:** The downloaded PDF of the slides is rendering incorrectly. The top labels on the slides are missing entirely, and the market share slides appear incomplete (charts are missing data or partially drawn).
*   **Technical Context:** The PDF generation tool (likely a canvas capture or headless browser script) is executing its snapshot before the DOM is fully rendered and before the charting library's animations have completed.
*   **Expected Behavior:** The PDF export function must be delayed or configured to wait for a promise that ensures all CSS animations have resolved and all DOM elements (including labels and chart SVGs/canvases) are 100% rendered before capturing the image.