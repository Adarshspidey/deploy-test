import json

from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy.orm import Session, joinedload

from app.auth import require_role
from app.database import get_db
from app.models import Assignment, Question, Submission, User, UserRole
from app.schemas import (
    AssignmentListItem,
    AssignmentResponse,
    SubmissionDetailResponse,
    SubmitAssignmentRequest,
)

router = APIRouter(prefix="/student", tags=["student"])


@router.get("/assignments", response_model=list[AssignmentListItem])
def list_assignments(
    db: Session = Depends(get_db),
    current_user: User = Depends(require_role(UserRole.STUDENT)),
):
    if not current_user.teacher_id:
        return []

    assignments = (
        db.query(Assignment)
        .options(joinedload(Assignment.questions), joinedload(Assignment.teacher))
        .filter(Assignment.teacher_id == current_user.teacher_id)
        .order_by(Assignment.created_at.desc())
        .all()
    )

    submissions = {
        s.assignment_id: s
        for s in db.query(Submission).filter(Submission.student_id == current_user.id).all()
    }

    result = []
    for assignment in assignments:
        submission = submissions.get(assignment.id)
        result.append(
            AssignmentListItem(
                id=assignment.id,
                title=assignment.title,
                description=assignment.description,
                teacher_name=assignment.teacher.full_name,
                created_at=assignment.created_at,
                total_questions=len(assignment.questions),
                completed=submission is not None,
                score=submission.score if submission else None,
                total=submission.total_questions if submission else None,
            )
        )
    return result


@router.get("/assignments/{assignment_id}", response_model=AssignmentResponse)
def get_assignment(
    assignment_id: int,
    db: Session = Depends(get_db),
    current_user: User = Depends(require_role(UserRole.STUDENT)),
):
    if not current_user.teacher_id:
        raise HTTPException(status_code=403, detail="You are not assigned to a teacher")

    assignment = (
        db.query(Assignment)
        .options(joinedload(Assignment.questions))
        .filter(
            Assignment.id == assignment_id,
            Assignment.teacher_id == current_user.teacher_id,
        )
        .first()
    )
    if not assignment:
        raise HTTPException(status_code=404, detail="Assignment not found")

    existing = (
        db.query(Submission)
        .filter(
            Submission.assignment_id == assignment_id,
            Submission.student_id == current_user.id,
        )
        .first()
    )
    if existing:
        raise HTTPException(status_code=400, detail="Assignment already submitted")

    return assignment


@router.post("/assignments/{assignment_id}/submit", response_model=SubmissionDetailResponse)
def submit_assignment(
    assignment_id: int,
    data: SubmitAssignmentRequest,
    db: Session = Depends(get_db),
    current_user: User = Depends(require_role(UserRole.STUDENT)),
):
    if not current_user.teacher_id:
        raise HTTPException(status_code=403, detail="You are not assigned to a teacher")

    assignment = (
        db.query(Assignment)
        .options(joinedload(Assignment.questions))
        .filter(
            Assignment.id == assignment_id,
            Assignment.teacher_id == current_user.teacher_id,
        )
        .first()
    )
    if not assignment:
        raise HTTPException(status_code=404, detail="Assignment not found")

    existing = (
        db.query(Submission)
        .filter(
            Submission.assignment_id == assignment_id,
            Submission.student_id == current_user.id,
        )
        .first()
    )
    if existing:
        raise HTTPException(status_code=400, detail="Assignment already submitted")

    questions_map = {q.id: q for q in assignment.questions}
    if len(data.answers) != len(assignment.questions):
        raise HTTPException(status_code=400, detail="Must answer all questions")

    score = 0
    answer_details = []
    for answer in data.answers:
        question = questions_map.get(answer.question_id)
        if not question:
            raise HTTPException(status_code=400, detail=f"Invalid question id: {answer.question_id}")

        is_correct = answer.selected_option == question.correct_option
        if is_correct:
            score += 1

        answer_details.append(
            {
                "question_id": question.id,
                "question_text": question.question_text,
                "selected_option": answer.selected_option,
                "correct_option": question.correct_option,
                "is_correct": is_correct,
            }
        )

    submission = Submission(
        assignment_id=assignment_id,
        student_id=current_user.id,
        answers=json.dumps(answer_details),
        score=score,
        total_questions=len(assignment.questions),
    )
    db.add(submission)
    db.commit()
    db.refresh(submission)

    return SubmissionDetailResponse(
        id=submission.id,
        assignment_id=assignment.id,
        assignment_title=assignment.title,
        score=submission.score,
        total_questions=submission.total_questions,
        submitted_at=submission.submitted_at,
        percentage=round((score / submission.total_questions) * 100, 1),
        answers=answer_details,
    )


@router.get("/assignments/{assignment_id}/result", response_model=SubmissionDetailResponse)
def get_assignment_result(
    assignment_id: int,
    db: Session = Depends(get_db),
    current_user: User = Depends(require_role(UserRole.STUDENT)),
):
    submission = (
        db.query(Submission)
        .options(joinedload(Submission.assignment))
        .filter(
            Submission.assignment_id == assignment_id,
            Submission.student_id == current_user.id,
        )
        .first()
    )
    if not submission:
        raise HTTPException(status_code=404, detail="Submission not found")

    return SubmissionDetailResponse(
        id=submission.id,
        assignment_id=submission.assignment_id,
        assignment_title=submission.assignment.title,
        score=submission.score,
        total_questions=submission.total_questions,
        submitted_at=submission.submitted_at,
        percentage=round((submission.score / submission.total_questions) * 100, 1),
        answers=json.loads(submission.answers),
    )
