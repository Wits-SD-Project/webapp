<p align="center">
  <img src="https://lively-island-05ba7a810.6.azurestaticapps.net/static/media/logo.abbcf75a55b99115aa0a.png" alt="SportsSphere Logo" width="200" style="border-radius: 50%;" />
</p>

<p align="center">
  <a href="https://github.com/Wits-SD-Project/webapp/actions">
    <img src="https://github.com/Wits-SD-Project/webapp/actions/workflows/azure-static-web-apps-lively-island-05ba7a810.yml/badge.svg" alt="CI/CD Status">
  </a>
  <a href="https://codecov.io/gh/Wits-SD-Project/webapp">
    <img src="https://codecov.io/gh/Wits-SD-Project/webapp/branch/main/graph/badge.svg" alt="Code Coverage">
  </a>
  <img src="https://img.shields.io/badge/release-v1.0.3-blue" alt="Release">
</p>

---

# SportsSphere

> A smart sports facility management platform for community engagement and operational efficiency.  
> **Live App:** [SportsSphere](https://lively-island-05ba7a810.6.azurestaticapps.net)  
> **Code coverage dashboard:** [Codecov](https://app.codecov.io/github/Wits-SD-Project/webapp)

**SportsSphere** is a full-stack web application that empowers residents, facility staff, and administrators to manage community sports facilities seamlessly. From real-time bookings to maintenance tracking and automated reporting, our system is designed to streamline every aspect of facility usage.

---

## ✨ Features

- 🗓️ **Facility Booking System** — View and reserve time slots for various facilities
- ✅ **Approval Workflow** — Facility staff can approve or reject bookings to avoid conflicts
- 🔔 **Smart Notifications** — Instant email updates for bookings and event reminders
- 🛠️ **Maintenance Reporting** — Residents can report issues; staff track and resolve them
- 📊 **Admin Reports** — Generate usage, maintenance, and trend reports for data-driven planning
- 🗺️ **Map Integration** — Visualize facility locations via embedded maps
- 🌦️ **Weather Forecasting** — Get upcoming weather info to plan outdoor activities
- 📅 **Calendar Sync** — Export events directly to Google or Outlook Calendar
- 🏟️ **Event Management** — Admins can publish and promote local sporting events

---

## 🚀 Quick Start

### 🛠️ Prerequisites

- Node.js 16.x or later
- npm
- `.env` file for the backend server

### 🧰 Setup Instructions

1. **Clone the repository**

   ```bash
   git clone https://github.com/Wits-SD-Project/webapp.git
   cd webapp
   ```

2. **Frontend Setup**

   1. **Download the `.env` file**
      Download it from [this link](https://drive.google.com/file/d/1lzbu_TXg-LEgdYhALJ7zPax-j4H8SR-4/view?usp=sharing) and place it inside the `/frontend` directory of the project.

   2. **Install dependencies and run the frontend**

   ```bash
   cd frontend
   npm install
   npm start
   ```

3. **Backend Setup**

   1. **Download the `.env` file**  
      Download it from [this link](https://drive.google.com/file/d/1_mef0sCEAqngYEX0YYgFpPsrckeEytPU/view?usp=sharing) and place it inside the `/server` directory of the project.

   2. **Install dependencies and run the server**
      ```bash
      cd ../server
      npm install
      npm start
      ```

---

## 👥 Demo Accounts

| Role           | Email                      | Password             |
| -------------- | -------------------------- | -------------------- |
| Admin          | ad.sportssphere@gmail.com  | admin_Sp0rtsSph3r3   |
| Facility Staff | staffsphere963@gmail.com   | staffsphere123       |
| Resident       | res.sportssphere@gmail.com | res_sp0rtSphere123!! |

---

## 🧩 User Stories

| Role           | Functionality                                                          |
| -------------- | ---------------------------------------------------------------------- |
| Resident       | View/book time slots, report maintenance, get event notifications...   |
| Facility Staff | Approve/reject bookings, manage maintenance reports, view schedule...  |
| Admin          | Block time slots, create events, generate usage/maintenance reports... |

For a detailed breakdown of completed stories, see our [documentation](https://sportssphere.mintlify.app).

---

## 🏗️ Tech Stack

- **Frontend**: React
- **Backend**: Express.js
- **Database**: Firebase Firestore
- **Authentication**: Firebase Auth
- **CI/CD**: GitHub Actions + Azure Static Web Apps
- **Weather**: Open-Meteo API
- **Maps**: Mapbox
- **Calendar Sync**: Google & Outlook integration

---

## 👨‍💻 Team

- **Katleho Morethi** — 2547684@students.wits.ac.za
- **Priyanka Gohil** — 2586288@students.wits.ac.za
- **Dimphonyana Mokoena** — 2538570@students.wits.ac.za
- **Wilfred Banda** — 2690284@students.wits.ac.za
- **Ibram Chilufya** — 2552005@students.wits.ac.za
- **Sachin Mohan** — 2699183@students.wits.ac.za

---

## 🤝 Contributing

We welcome contributions to improve SportsSphere. Submit issues or pull requests through GitHub.

---

## 📝 License

This project is licensed under the [MIT License](https://opensource.org/licenses/MIT). You are free to use, modify, and distribute this software.

---

<p align=\"center\">⚽ Where code meets the court 🏀 — Wits COMS3009A Software Design 🔧
