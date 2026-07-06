import json

from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy.orm import Session, joinedload

from app.auth import get_password_hash, require_role
from app.database import get_db
from app.models import Assignment, Question, Submission, User, UserRole
from app.schemas import AssignmentCreate, AssignmentResponse, UserCreate, UserResponse

router = APIRouter(prefix="/teacher", tags=["teacher"])


@router.get("/students", response_model=list[UserResponse])
def list_my_students(
    db: Session = Depends(get_db),
    current_user: User = Depends(require_role(UserRole.TEACHER)),
):
    return (
        db.query(User)
        .filter(User.role == UserRole.STUDENT, User.teacher_id == current_user.id)
        .order_by(User.full_name)
        .all()
    )


@router.post("/students", response_model=UserResponse, status_code=status.HTTP_201_CREATED)
def add_student(
    data: UserCreate,
    db: Session = Depends(get_db),
    current_user: User = Depends(require_role(UserRole.TEACHER)),
):
    if db.query(User).filter(User.email == data.email).first():
        raise HTTPException(status_code=400, detail="Email already registered")

    student = User(
        email=data.email,
        full_name=data.full_name,
        hashed_password=get_password_hash(data.password),
        role=UserRole.STUDENT,
        teacher_id=current_user.id,
    )
    db.add(student)
    db.commit()
    db.refresh(student)
    return student


@router.post("/assignments", response_model=AssignmentResponse, status_code=status.HTTP_201_CREATED)
def create_assignment(
    data: AssignmentCreate,
    db: Session = Depends(get_db),
    current_user: User = Depends(require_role(UserRole.TEACHER)),
):
    assignment = Assignment(
        title=data.title,
        description=data.description,
        teacher_id=current_user.id,
    )
    db.add(assignment)
    db.flush()

    for q in data.questions:
        question = Question(
            assignment_id=assignment.id,
            question_text=q.question_text,
            option_a=q.option_a,
            option_b=q.option_b,
            option_c=q.option_c,
            option_d=q.option_d,
            correct_option=q.correct_option,
        )
        db.add(question)

    db.commit()
    db.refresh(assignment)
    assignment = (
        db.query(Assignment)
        .options(joinedload(Assignment.questions))
        .filter(Assignment.id == assignment.id)
        .first()
    )
    return assignment


@router.get("/assignments", response_model=list[AssignmentResponse])
def list_my_assignments(
    db: Session = Depends(get_db),
    current_user: User = Depends(require_role(UserRole.TEACHER)),
):
    return (
        db.query(Assignment)
        .options(joinedload(Assignment.questions))
        .filter(Assignment.teacher_id == current_user.id)
        .order_by(Assignment.created_at.desc())
        .all()
    )


@router.get("/assignments/{assignment_id}/submissions")
def get_assignment_submissions(
    assignment_id: int,
    db: Session = Depends(get_db),
    current_user: User = Depends(require_role(UserRole.TEACHER)),
):
    assignment = (
        db.query(Assignment)
        .filter(Assignment.id == assignment_id, Assignment.teacher_id == current_user.id)
        .first()
    )
    if not assignment:
        raise HTTPException(status_code=404, detail="Assignment not found")

    submissions = (
        db.query(Submission)
        .options(joinedload(Submission.student))
        .filter(Submission.assignment_id == assignment_id)
        .order_by(Submission.submitted_at.desc())
        .all()
    )

    return [
        {
            "id": s.id,
            "student_name": s.student.full_name,
            "student_email": s.student.email,
            "score": s.score,
            "total_questions": s.total_questions,
            "percentage": round((s.score / s.total_questions) * 100, 1) if s.total_questions else 0,
            "submitted_at": s.submitted_at,
        }
        for s in submissions
    ]
