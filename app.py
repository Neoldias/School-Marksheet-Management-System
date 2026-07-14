from fastapi import FastAPI, HTTPException
from fastapi.middleware.cors import CORSMiddleware
from pydantic import BaseModel, Field
from typing import Optional, List
from database import connect
import mysql.connector
import uvicorn

app = FastAPI(title="School Marksheet System API")

# Setup CORS
app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# Pydantic Schemas
class StudentCreate(BaseModel):
    name: str
    class_name: Optional[str] = Field(None, alias="class")
    phone: Optional[str] = None

    class Config:
        populate_by_name = True

class MarkEntry(BaseModel):
    subject_id: int
    marks: int

class BatchMarksCreate(BaseModel):
    student_id: int
    marks: List[MarkEntry]

@app.get("/api/classes")
def get_classes():
    db = connect()
    cursor = db.cursor()
    try:
        cursor.execute("SELECT DISTINCT class FROM students WHERE class IS NOT NULL AND class != ''")
        classes = [row[0] for row in cursor.fetchall()]
        # If no classes exist, we could return a default placeholder list or empty list
        return classes
    except mysql.connector.Error as err:
        raise HTTPException(status_code=500, detail=str(err))
    finally:
        cursor.close()
        db.close()

@app.get("/api/classes/{class_name}/students")
def get_class_students(class_name: str):
    db = connect()
    cursor = db.cursor(dictionary=True)
    try:
        cursor.execute("SELECT * FROM students WHERE class = %s", (class_name,))
        students = cursor.fetchall()
        return students
    except mysql.connector.Error as err:
        raise HTTPException(status_code=500, detail=str(err))
    finally:
        cursor.close()
        db.close()

@app.post("/api/students", status_code=201)
def add_student(student: StudentCreate):
    if not student.name:
        raise HTTPException(status_code=400, detail="Name is required")

    db = connect()
    cursor = db.cursor()
    try:
        sql = "INSERT INTO students(name, class, phone) VALUES(%s, %s, %s)"
        cursor.execute(sql, (student.name, student.class_name, student.phone))
        db.commit()
        student_id = cursor.lastrowid
        return {"message": "Student added successfully", "student_id": student_id}
    except mysql.connector.Error as err:
        raise HTTPException(status_code=500, detail=str(err))
    finally:
        cursor.close()
        db.close()

@app.get("/api/subjects")
def get_subjects():
    db = connect()
    cursor = db.cursor(dictionary=True)
    try:
        cursor.execute("SELECT * FROM subjects")
        subjects = cursor.fetchall()
        return subjects
    except mysql.connector.Error as err:
        raise HTTPException(status_code=500, detail=str(err))
    finally:
        cursor.close()
        db.close()

@app.post("/api/marks/batch", status_code=201)
def add_batch_marks(data: BatchMarksCreate):
    db = connect()
    cursor = db.cursor()
    try:
        # We delete existing marks for this student for safety/overwriting or we can just append. 
        # Typically, doing a clean insert/update is better. Let's delete existing first, then insert.
        cursor.execute("DELETE FROM marks WHERE student_id = %s", (data.student_id,))
        
        sql = "INSERT INTO marks(student_id, subject_id, marks) VALUES(%s, %s, %s)"
        entries = [(data.student_id, item.subject_id, item.marks) for item in data.marks]
        cursor.executemany(sql, entries)
        db.commit()
        return {"message": "Batch marks added successfully"}
    except mysql.connector.Error as err:
        raise HTTPException(status_code=500, detail=str(err))
    finally:
        cursor.close()
        db.close()

@app.get("/api/marksheet/{student_id}")
def get_marksheet(student_id: int):
    db = connect()
    cursor = db.cursor(dictionary=True)
    try:
        # Check if student exists
        cursor.execute("SELECT * FROM students WHERE student_id = %s", (student_id,))
        student = cursor.fetchone()
        if not student:
            raise HTTPException(status_code=404, detail="Student not found")

        # Fetch marks joined with subjects
        query = """
        SELECT subjects.subject_id, subjects.subject_name, subjects.max_marks, marks.marks
        FROM marks
        JOIN subjects ON marks.subject_id = subjects.subject_id
        WHERE marks.student_id = %s
        """
        cursor.execute(query, (student_id,))
        marks_records = cursor.fetchall()

        # Calculate totals if they have marks
        total_obtained = sum(r['marks'] for r in marks_records)
        total_max = sum(r['max_marks'] for r in marks_records)
        percentage = (total_obtained / total_max * 100) if total_max > 0 else 0
        
        # Calculate grade
        if len(marks_records) == 0:
            grade = 'N/A'
        elif percentage >= 90: grade = 'A+'
        elif percentage >= 80: grade = 'A'
        elif percentage >= 70: grade = 'B'
        elif percentage >= 60: grade = 'C'
        elif percentage >= 50: grade = 'D'
        elif percentage >= 40: grade = 'E'
        else: grade = 'F'

        return {
            "student": student,
            "marks": marks_records,
            "total_obtained": total_obtained,
            "total_max": total_max,
            "percentage": round(percentage, 2),
            "grade": grade
        }
    except mysql.connector.Error as err:
        raise HTTPException(status_code=500, detail=str(err))
    finally:
        cursor.close()
        db.close()

if __name__ == '__main__':
    uvicorn.run("app:app", host="127.0.0.1", port=8000, reload=True)
