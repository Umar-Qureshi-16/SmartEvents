# SmartEvents — Event Management System

## Project Info
- **Type**: Final Year Project (FYP-2)
- **Stack**: MongoDB, Express.js, React 19 (Vite), Node.js
- **Key Feature**: InDrive-style real-time price negotiation for event bookings

## Roles
| Role | Capabilities |
|---|---|
| Customer | Browse events, make offers, negotiate, review |
| Provider | List services, manage bookings, accept/counter offers |
| Admin | Manage users, view audit logs, moderate content |
| SuperAdmin | Fraud detection, platform governance, analytics |

## Setup

### Prerequisites
- Node.js 18+
- MongoDB running locally or Atlas URI

### Backend
cd server
npm install
cp .env.example .env   # fill in your values
npm run dev

### Frontend
cd client
npm install
npm run dev

### Seed Data
cd server
node scripts/seedData.js

## Environment Variables
See server/.env.example for all required variables.
