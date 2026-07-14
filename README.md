# School Marksheet System

A full-stack application for managing school student details, adding subject marks, and generating detailed report cards/marksheets.

## Features

- **Class & Student Management**: Categorize students by class and manage details.
- **Marks Entry**: Batch entry of marks for students across various subjects.
- **Marksheet Generation**: Automated marksheet generation with totals, percentage, and grading logic.
- **Responsive Frontend UI**: Clean and interactive dashboard interface built with Vite and modern CSS.

## Tech Stack

- **Backend**: FastAPI (Python), MySQL, Uvicorn
- **Frontend**: Vite (React/JS), Vanilla CSS

## Setup Instructions

### Backend (FastAPI)

1. Navigate to the root directory.
2. Install Python dependencies:
   ```bash
   pip install fastapi mysql-connector-python uvicorn pydantic
   ```
3. Configure your MySQL database settings in `database.py`.
4. Ensure your database contains a schema named `school_marksheet` with tables for `students`, `subjects`, and `marks`.
5. Run the backend server:
   ```bash
   python app.py
   ```
   The API will be available at `http://127.0.0.1:8000`.

### Frontend (Vite)

1. Navigate to the `frontend` directory:
   ```bash
   cd frontend
   ```
2. Install frontend dependencies:
   ```bash
   npm install
   ```
3. Start the Vite development server:
   ```bash
   npm run dev
   ```
4. Access the web app via the local URL displayed (typically `http://localhost:5173`).
