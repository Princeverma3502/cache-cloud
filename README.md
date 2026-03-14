# Cache-Cloud Engine 🚀

A high-performance, distributed proxy server built with **Node.js**, **Redis**, and **React**. This project demonstrates advanced backend patterns like **Request Coalescing** to prevent cache stampedes and real-time observability.

## 🌟 Key Features

-   **Request Coalescing (Wait-Group Pattern):** Identical simultaneous requests are collapsed into a single upstream call, saving bandwidth and server resources.
-   **Distributed Caching:** Leveraging Redis for sub-millisecond data retrieval.
-   **Dynamic TTL Control:** Real-time adjustment of cache expiration via the dashboard.
-   **Live Observability:** A React-based dashboard featuring:
    -   Traffic velocity charts (Recharts).
    -   Real-time HIT/MISS/COALESCED stream.
    -   Instant cache purge capabilities.

## 🏗️ Architecture



The system is fully containerized using **Docker Compose**, ensuring a consistent environment across development and production.

## 🚀 Getting Started

### Prerequisites
-   Docker & Docker Compose

### Installation
1. Clone the repository:
   ```bash
   git clone [https://github.com/your-username/cache-cloud.git](https://github.com/your-username/cache-cloud.git)
   cd cache-cloud