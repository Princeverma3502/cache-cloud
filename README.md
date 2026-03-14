# CloudShield: High-Performance Edge Proxy & Cache Engine 🛡️

CloudShield is a production-grade middleware proxy designed to optimize API traffic, reduce upstream latency, and prevent "Cache Stampedes" through intelligent request coalescing. It features a real-time observability dashboard with global traffic visualization.

![CloudShield Dashboard Preview](./dashboard.png)

## 🚀 Key Engineering Features

### 1. Request Coalescing (The "Wait-Group" Pattern)
Prevents redundant upstream calls by collapsing multiple concurrent requests for the same resource into a single fetch. This significantly reduces server load during traffic spikes.

### 2. Distributed Caching with Redis
Utilizes Redis for sub-millisecond data retrieval. Supports dynamic TTL (Time-to-Live) management controlled directly via the dashboard.

### 3. Global Traffic Radar
Automatically resolves upstream host IPs to geographic coordinates, providing a real-time visualization of data origins on a monochromatic world radar.

### 4. Smart Latency Savings Calculator
A real-time telemetry engine that calculates the total network time saved (in milliseconds) by serving data from the cache or coalescing pending requests.

### 5. API Authentication Shield
Implements a secure `x-api-key` header requirement to protect the proxy middleware from unauthorized use, complete with a key-rotation management system.

---

## 🛠️ Technical Stack

- **Frontend:** React, Tailwind CSS, Lucide, Recharts, React-Simple-Maps
- **Backend:** Node.js, Express, Axios
- **Storage:** Redis (High-speed Key-Value Store)
- **Infrastructure:** Docker, Docker-Compose

---

## ⚡ Quick Start (Docker)

Ensure you have Docker Desktop installed, then run:

```bash
# Clone the repository
git clone [https://github.com/your-username/cache-cloud.git](https://github.com/your-username/cache-cloud.git)

# Spin up the infrastructure
docker-compose up --build