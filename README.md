# Referendum-website-for-a-government-poll
This is a voting website that I created that allows the election commissioner to create edit and delete referendums, and it allows the general public to register accounts and vote. it is set up locally, using react.js and MySQL.

# MSLR Referendum System – How to Run

This project is a full-stack web application consisting of a React frontend and a Node.js/Express backend.  
Both must be running at the same time in separate terminals.

The repository/folder ive submitted already contains all required files.

---

## Prerequisites

Before running the application, ensure you have installed the following:

- Node.js (v18+ recommended)
- npm
- MySQL Server running locally - you need to change the password in my folder of mslr/server/db.js

---

## Running the Application

### 1. Start the Backend (Server)

Open a terminal and navigate to the server folder:

cd mslr/server
Install dependencies (only needed the first time):
npm install
Start the server:
node server.js
If successful, you should see:
Server running on http://localhost:3001
Leave this terminal running.


2. Start the Frontend (Client)
Open a second terminal and navigate to the client folder:
cd mslr/client
Install dependencies (only needed the first time):
npm install
Start the development server:
npm run dev
when Vite displays a local URL:
http://localhost:5173
Open this link in a web browser to use the application.


Important Notes
The backend must be running before the frontend is used.
The frontend and backend run on different ports and communicate using HTTP requests.
If either terminal is closed, that part of the application will stop working.

Stopping the Application
To stop either the server or client, press:
Ctrl + C in the terminal (im on macbook)
in the corresponding terminal.

navigating the application is self explanatory with the buttons on the top left of the page. 


Once the application is running:
Register or log in
After logging in:
    Voters are directed to the Voter Dashboard
    Election Commissioners (EC) are directed to the EC Dashboard
As an EC, you can:
    Create new referendums
    Edit referendums before they are opened
    Open and close referendums
    View live voting results and charts
As a Voter, you can:
    View open referendums
    Vote once per referendum
    View vote totals and results
    See whether a referendum is open or closed
Voting is intentionally restricted to one vote per voter per referendum to prevent abuse and ensure fairness.
