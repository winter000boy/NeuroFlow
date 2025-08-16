NeuroFlow: A Workflow-Driven Task Automation Platform
<div align="center">
<img src="https-placehold-co-600x300-34d399-ffffff-text-NeuroFlow.png" alt="NeuroFlow Banner" width="600"/>
</div>

<p align="center">
<strong>An enterprise-grade, full-stack platform for creating, managing, and executing complex automation workflows with real-time monitoring.</strong>
</p>

<p align="center">
<a href="#key-features">Key Features</a> •
<a href="#architecture">Architecture</a> •
<a href="#technology-stack">Tech Stack</a> •
<a href="#getting-started">Getting Started</a> •
<a href="#contributing">Contributing</a> •
<a href="#license">License</a>
</p>

<p align="center">
<!-- TODO: Add badges for CI/CD, license, etc. -->
<img src="https://img.shields.io/badge/PRs-welcome-brightgreen.svg?style=flat-square" alt="PRs Welcome">
<img src="https://img.shields.io/github/license/winter000boy/NeuroFlow?style=flat-square" alt="License">
<img src="https://img.shields.io/badge/status-active-success.svg?style=flat-square" alt="Status">
</p>

Introduction
NeuroFlow is a modern, scalable, and portfolio-ready task automation platform inspired by tools like Zapier and IFTTT. It provides a seamless experience for users to build and manage complex automation workflows through an intuitive web interface. The backend is powered by Node.js and integrates with the powerful n8n.io engine for workflow execution, while the frontend is a responsive React application.

This project is built with an enterprise-grade mindset, showcasing best practices in software architecture, testing, and development workflows. It serves as a strong foundation for a production-ready system and is open for contributions from the community.

Key Features
🔐 Secure User Authentication: Secure registration and login with JWT access/refresh tokens and HTTP-only cookies.

🎨 Intuitive Workflow Management: A full CRUD interface to create, view, edit, and manage automation workflows.

🚀 Powerful n8n Integration: Offloads complex workflow logic to a robust, dedicated n8n execution engine.

📊 Real-time Execution Monitoring: Uses WebSockets to provide live updates on workflow progress and status changes.

📈 Comprehensive History & Analytics: View detailed execution history, logs, and analytics to optimize and debug workflows.

📱 Responsive Frontend: A modern, responsive UI built with React and Tailwind CSS that works seamlessly across all devices.

📚 API Documentation: Auto-generated OpenAPI (Swagger) documentation for clear, easy-to-use API endpoints.

🐳 Dockerized Development: A simple, one-command setup using Docker Compose for a consistent local development environment.

Architecture
NeuroFlow is designed with a clean, modular, and scalable architecture that separates concerns between the frontend, backend, and external services.

graph TB
    subgraph "Frontend (React + TypeScript)"
        UI[React Components]
        Store[Redux Toolkit Store]
        API[API Layer / React Query]
        WS[WebSocket Client]
    end
    
    subgraph "Backend (Node.js + Express)"
        Router[Express Routes]
        Controller[Controllers]
        Service[Services]
        Repository[Repositories]
        Middleware[Middleware]
        WSServer[WebSocket Server]
    end
    
    subgraph "External Services"
        N8N[n8n Workflow Engine]
        DB[(PostgreSQL)]
        Redis[(Redis for Sessions/Queues)]
    end
    
    UI --> Store
    Store --> API
    API --> Router
    Router --> Controller
    Controller --> Service
    Service --> Repository
    Repository --> DB
    
    WS --> WSServer
    WSServer --> Service
    
    Service --> N8N
    N8N --> Service

Technology Stack
Frontend
Framework: React 18 with TypeScript

State Management: Redux Toolkit & React Query

Routing: React Router v6

Styling: Tailwind CSS

Forms: React Hook Form

Real-time: Socket.IO Client

Backend
Framework: Node.js with Express & TypeScript

ORM: Prisma with PostgreSQL

Validation: Zod

Authentication: JWT (Access & Refresh Tokens)

Real-time: Socket.IO

Logging: Winston

Testing: Jest

Infrastructure
Development: Docker Compose

Workflow Engine: n8n

Database: PostgreSQL

Caching/Sessions: Redis (Optional)

Getting Started
Follow these instructions to get the project up and running on your local machine for development and testing purposes.

Prerequisites
Node.js (v18 or later)

Docker and Docker Compose

pnpm (or npm/yarn)

1. Clone the Repository
git clone https://github.com/winter000boy/NeuroFlow.git
cd NeuroFlow

2. Configure Environment Variables
You need to set up environment variables for both the server and the client.

For the server (/server):
Create a .env file in the /server directory by copying the example file:

cd server
cp .env.example .env

Now, edit the .env file with your database credentials, JWT secrets, and other settings.

For the client (/client):
Create a .env file in the /client directory:

cd ../client
cp .env.example .env

Update the VITE_API_BASE_URL to point to your local server (e.g., http://localhost:8000).

3. Start Dependent Services
The project uses Docker Compose to manage services like PostgreSQL, n8n, and Redis.
From the root directory of the project, run:

docker-compose up -d

This will start all the required services in the background.

4. Install Dependencies
Install dependencies for both the server and client applications.

# From the root directory
# Install server dependencies
cd server && pnpm install

# Install client dependencies
cd ../client && pnpm install

5. Run Database Migrations
With the PostgreSQL container running, apply the database schema using Prisma.

# From the /server directory
npx prisma migrate dev

6. Run the Application
You can now start the backend and frontend servers.

Start the Backend Server:

# From the /server directory
pnpm run dev

The server should now be running on http://localhost:8000.

Start the Frontend Development Server:

# From the /client directory
pnpm run dev

The React application will be available at http://localhost:5173.

Testing
The project is configured with Jest for backend testing.

To run the tests, navigate to the /server directory and run:

cd server
pnpm test

Contributing
Contributions are what make the open-source community such an amazing place to learn, inspire, and create. Any contributions you make are greatly appreciated.

If you have a suggestion that would make this better, please fork the repo and create a pull request. You can also simply open an issue with the tag "enhancement".

How to Contribute
Fork the Project: Click the 'Fork' button at the top right of this page.

Create your Feature Branch: git checkout -b feature/AmazingFeature

Commit your Changes: git commit -m 'Add some AmazingFeature'

Push to the Branch: git push origin feature/AmazingFeature

Open a Pull Request: Go to your forked repository on GitHub and click the 'New pull request' button.

Please make sure your code adheres to the existing style and that all tests pass.

License
Distributed under the MIT License. See LICENSE for more information.

<p align="center">
Built with ❤️ by the NeuroFlow Community
</p>
