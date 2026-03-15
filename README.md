# 🛡️ CloudShield

![CloudShield Banner](https://via.placeholder.com/1200x300/020617/3b82f6?text=CloudShield+-+Global+Infrastructure+%26+Traffic+Monitoring)

[![License: MIT](https://img.shields.io/badge/License-MIT-blue.svg)](https://opensource.org/licenses/MIT)
[![React](https://img.shields.io/badge/React-18.x-61DAFB?logo=react&logoColor=white)](https://reactjs.org/)
[![Node.js](https://img.shields.io/badge/Node.js-18.x-339933?logo=nodedotjs&logoColor=white)](https://nodejs.org/)
[![Supabase](https://img.shields.io/badge/Supabase-Auth-3ECF8E?logo=supabase&logoColor=white)](https://supabase.com/)

**CloudShield** is a full-stack, real-time infrastructure monitoring and global traffic routing dashboard. Built as a multi-tenant SaaS application, it allows developers to track global request velocity, monitor network relief (bandwidth savings), and generate shareable, public health reports for their web properties.

## ✨ Key Features

* **🌍 Universal Tracking Script (`shield.js`)**: A lightweight, async JavaScript snippet that can be dropped into any HTML, WordPress, or React site to instantly begin routing telemetry data.
* **📊 Real-Time Global Analytics**: Live request mapping using `react-simple-maps` and latency tracking visualized with `recharts`.
* **🔗 Public SaaS Reports**: Users can generate unique, `clientId`-scoped public URLs to share infrastructure health with clients or stakeholders. Includes custom 404 routing for invalid links.
* **📄 PDF Generation**: One-click client-side PDF export of dashboard metrics utilizing `html2canvas` and `jsPDF`.
* **🚨 Incident Monitoring**: Automated detection of RTT latency spikes and connection drops, logged into a session history timeline.
* **🔐 Secure Authentication**: Frictionless developer login powered by Supabase and GitHub OAuth.
* **🎨 Modern, Fluid UI**: Fully responsive glass-morphism design with Framer Motion animations and dynamic Dark/Light mode toggling.

---

## 🛠️ Technology Stack

**Frontend:**
* React.js
* Tailwind CSS
* Framer Motion (Animations)
* Recharts (Data Visualization)
* React-Simple-Maps (Geospatial Data)
* Supabase Auth (GitHub OAuth)

**Backend:**
* Node.js & Express
* Axios & Response-Time
* Custom In-Memory Telemetry Collector (Extendable to Redis/PostgreSQL)

---

## 🚀 Quick Start

### Prerequisites
* Node.js (v16 or higher)
* A Supabase project (for GitHub Auth)
* npm or yarn

### 1. Clone the repository
\`\`\`bash
git clone https://github.com/Princeverma3502/cloudshield.git
cd cloudshield
\`\`\`

### 2. Setup Backend Environment
Navigate to the backend directory and install dependencies:
\`\`\`bash
cd backend
npm install
\`\`\`
Start the backend server:
\`\`\`bash
npm run dev
\`\`\`

### 3. Setup Frontend Environment
Open a new terminal, navigate to the frontend directory, and install dependencies:
\`\`\`bash
cd frontend
npm install
\`\`\`
Create a `.env` file in the `frontend` directory:
\`\`\`env
REACT_APP_SUPABASE_URL=your_supabase_project_url
REACT_APP_SUPABASE_ANON_KEY=your_supabase_anon_key
REACT_APP_API_URL=http://localhost:10000
\`\`\`
Start the development server:
\`\`\`bash
npm start
\`\`\`

---

## 🔌 Integration Guide

To monitor an external website, simply copy the auto-generated tracking script from your CloudShield **Integration** tab and paste it into the `<head>` of your target website.

\`\`\`html
<script 
  src="https://your-cloudshield-backend.com/shield.js" 
  data-client-id="your-unique-user-id" 
  async>
</script>
\`\`\`
*Data will instantly begin flowing into your live dashboard and world map.*

---

## 💡 Architecture Highlight

CloudShield operates on a decoupled architecture. The Express.js backend serves a dynamic `shield.js` file that reads the injecting script's `data-client-id` attribute. This allows the backend to securely scope all incoming telemetry (Hits, Misses, Geo-coordinates) to specific users, enabling the multi-tenant Public Report feature without data bleed.

---

## 🤝 Contributing
Contributions, issues, and feature requests are welcome! Feel free to check the [issues page](https://github.com/yourusername/cloudshield/issues).

## 📝 License
This project is [MIT](https://opensource.org/licenses/MIT) licensed.