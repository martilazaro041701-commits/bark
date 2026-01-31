# Modu

Modu is a high-performance body shop management system built with Python, Django, and JS. It mirrors the precision of warehouse inventory tracking to provide real-time visibility into the vehicle repair lifecycle.

🚀 Key Features

- Status-Driven Tracking: Vehicles move through granular phases (Approval, Parts, Repair, Pickup, Billing, Dismantle) inspired by warehouse WMS logic.
- Single-Row Dashboard: A high-density "Active Jobs" table that ensures all vital job info is visible in one clean, non-wrapping row.
- Advanced Analytics: Dynamic line charts for job intake and KPI meters for throughput, adjusting across Today, 7-day, and 30-day views.
- Cycle Time Analysis: Precision logging of every phase transition to calculate exactly how long jobs spend in specific stages like "LOA Processing" or "Body Paint."
- Smart Filtering & Search: "Mini-pop" filter selections and global search that query the entire database across paginated results (50 jobs per page).
- Superuser Control: Exclusive ability for superusers to backdate or edit phase timestamps for accurate job history correction.

🛠 Tech Stack

- Backend: Django (Python) with a "Status-Driven" PostgreSQL/SQLite architecture.
- Frontend: JavaScript (Vanilla/Alpine.js) for asynchronous state updates and modal morphing.
- Styling: Tailwind CSS for a sleek, "Apple-style" glassmorphism aesthetic.
- Animations: GSAP for "buttery smooth" transitions and pop-up interactions.

📊 Repair Phases

- Approval: From Estimation to LOA (Letter of Authorization) Approval.
- Parts: Tracking availability, ordering, and arrival.
- Repair: Managing body work, paint, and final testing.
- Pickup: Customer coordination and vehicle release.
- Billing: Unpaid receivables and final payment processing.
- Dismantle: Initial teardown and assessment.
