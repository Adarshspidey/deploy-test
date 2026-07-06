from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy.orm import Session

from app.auth import get_password_hash, require_role
from app.database import get_db
from app.models import User, UserRole
from app.schemas import AssignStudentRequest, UserCreate, UserResponse, UserWithTeacher

router = APIRouter(prefix="/admin", tags=["admin"])


@router.post("/teachers", response_model=UserResponse, status_code=status.HTTP_201_CREATED)
def create_teacher(
    data: UserCreate,
    db: Session = Depends(get_db),
    _: User = Depends(require_role(UserRole.SUPER_ADMIN)),
):
    if db.query(User).filter(User.email == data.email).first():
        raise HTTPException(status_code=400, detail="Email already registered")

    teacher = User(
        email=data.email,
        full_name=data.full_name,
        hashed_password=get_password_hash(data.password),
        role=UserRole.TEACHER,
    )
    db.add(teacher)
    db.commit()
    db.refresh(teacher)
    return teacher


@router.get("/teachers", response_model=list[UserResponse])
def list_teachers(
    db: Session = Depends(get_db),
    _: User = Depends(require_role(UserRole.SUPER_ADMIN)),
):
    return db.query(User).filter(User.role == UserRole.TEACHER).order_by(User.full_name).all()


@router.get("/students", response_model=list[UserWithTeacher])
def list_students(
    db: Session = Depends(get_db),
    _: User = Depends(require_role(UserRole.SUPER_ADMIN)),
):
    students = db.query(User).filter(User.role == UserRole.STUDENT).order_by(User.full_name).all()
    result = []
    for student in students:
        teacher_name = None
        if student.teacher_id:
            teacher = db.query(User).filter(User.id == student.teacher_id).first()
            teacher_name = teacher.full_name if teacher else None
        result.append(
            UserWithTeacher(
                id=student.id,
                email=student.email,
                full_name=student.full_name,
                role=student.role,
                teacher_id=student.teacher_id,
                created_at=student.created_at,
                teacher_name=teacher_name,
            )
        )
    return result


@router.post("/students", response_model=UserResponse, status_code=status.HTTP_201_CREATED)
def create_student(
    data: UserCreate,
    teacher_id: int | None = None,
    db: Session = Depends(get_db),
    _: User = Depends(require_role(UserRole.SUPER_ADMIN)),
):
    if db.query(User).filter(User.email == data.email).first():
        raise HTTPException(status_code=400, detail="Email already registered")

    if teacher_id is not None:
        teacher = db.query(User).filter(User.id == teacher_id, User.role == UserRole.TEACHER).first()
        if not teacher:
            raise HTTPException(status_code=404, detail="Teacher not found")

    student = User(
        email=data.email,
        full_name=data.full_name,
        hashed_password=get_password_hash(data.password),
        role=UserRole.STUDENT,
        teacher_id=teacher_id,
    )
    db.add(student)
    db.commit()
    db.refresh(student)
    return student


@router.put("/students/{student_id}/assign", response_model=UserResponse)
def assign_student_to_teacher(
    student_id: int,
    data: AssignStudentRequest,
    db: Session = Depends(get_db),
    _: User = Depends(require_role(UserRole.SUPER_ADMIN)),
):
    student = db.query(User).filter(User.id == student_id, User.role == UserRole.STUDENT).first()
    if not student:
        raise HTTPException(status_code=404, detail="Student not found")

    teacher = db.query(User).filter(User.id == data.teacher_id, User.role == UserRole.TEACHER).first()
    if not teacher:
        raise HTTPException(status_code=404, detail="Teacher not found")

    student.teacher_id = data.teacher_id
    db.commit()
    db.refresh(student)
    return student
