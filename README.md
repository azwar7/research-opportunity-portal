# Research Opportunity Portal

A web app for managing university research opportunities: Flask REST API,
MySQL database, and a Bootstrap frontend.

GitHub Repository: https://github.com/azwar7/research-opportunity-portal

## Tech stack
- Backend: Python, Flask
- Database: MySQL (XAMPP or standalone)
- Frontend: HTML, CSS, JavaScript, Bootstrap 5
- API testing: Postman

## Project structure
backend/ (app.py, db.py, requirements.txt, .env.example)
frontend/ (index.html, style.css, script.js)
database/ (schema.sql)
postman/ (collection.json)

## Setup and run

### 1. Database
1. Start MySQL (XAMPP Control Panel, or your own MySQL server).
2. Run `database/schema.sql` (phpMyAdmin SQL tab, or `mysql -u root < database/schema.sql`).

### 2. Backend
cd backend
python -m venv venv
venv\Scripts\activate        (Mac/Linux: source venv/bin/activate)
pip install -r requirements.txt
copy .env.example .env       (Mac/Linux: cp .env.example .env)
Edit .env if your MySQL user, password or port differ.
python app.py
The API runs at http://127.0.0.1:5000

### 3. Frontend
Open frontend/index.html in a browser (the backend must be running).

## API endpoints
| Method | URL | Description | Success |
|---|---|---|---|
| POST | /api/opportunities | Create | 201 |
| GET | /api/opportunities | Get all | 200 |
| GET | /api/opportunities/:id | Get one | 200 |
| PUT | /api/opportunities/:id | Update (also closes) | 200 |
| DELETE | /api/opportunities/:id | Delete | 200 |

Errors: 400 invalid data, 404 not found, 500 server error.

## Testing
Import postman/collection.json into Postman.

## Demo video
(add your link here, or note that it is included in the ZIP)
