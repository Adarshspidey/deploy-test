from datetime import datetime
from typing import Literal

from pydantic import BaseModel, EmailStr, Field

from app.models import UserRole


class Token(BaseModel):
    access_token: str
    token_type: str = "bearer"


class LoginRequest(BaseModel):
    email: EmailStr
    password: str


class UserBase(BaseModel):
    email: EmailStr
    full_name: str


class UserCreate(UserBase):
    password: str = Field(min_length=6)


class UserResponse(UserBase):
    id: int
    role: UserRole
    teacher_id: int | None = None
    created_at: datetime

    model_config = {"from_attributes": True}


class UserWithTeacher(UserResponse):
    teacher_name: str | None = None


class AssignStudentRequest(BaseModel):
    teacher_id: int


class QuestionCreate(BaseModel):
    question_text: str
    option_a: str
    option_b: str
    option_c: str
    option_d: str
    correct_option: Literal["A", "B", "C", "D"]


class AssignmentCreate(BaseModel):
    title: str
    description: str | None = None
    questions: list[QuestionCreate] = Field(min_length=1)


class QuestionResponse(BaseModel):
    id: int
    question_text: str
    option_a: str
    option_b: str
    option_c: str
    option_d: str

    model_config = {"from_attributes": True}


class QuestionWithAnswer(QuestionResponse):
    correct_option: str


class AssignmentResponse(BaseModel):
    id: int
    title: str
    description: str | None
    teacher_id: int
    created_at: datetime
    questions: list[QuestionResponse] = []

    model_config = {"from_attributes": True}


class AssignmentListItem(BaseModel):
    id: int
    title: str
    description: str | None
    teacher_name: str
    created_at: datetime
    total_questions: int
    completed: bool = False
    score: int | None = None
    total: int | None = None


class SubmitAnswer(BaseModel):
    question_id: int
    selected_option: Literal["A", "B", "C", "D"]


class SubmitAssignmentRequest(BaseModel):
    answers: list[SubmitAnswer]


class SubmissionResponse(BaseModel):
    id: int
    assignment_id: int
    assignment_title: str
    score: int
    total_questions: int
    submitted_at: datetime
    percentage: float

    model_config = {"from_attributes": True}


class SubmissionDetailResponse(SubmissionResponse):
    answers: list[dict]
