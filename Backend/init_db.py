"""Seed the database with default users for each role."""

from app.auth import get_password_hash
from app.database import Base, SessionLocal, engine
from app.models import User, UserRole

DEFAULT_USERS = [
    {
        "email": "admin@school.com",
        "password": "admin123",
        "full_name": "Super Admin",
        "role": UserRole.SUPER_ADMIN,
        "teacher_id": None,
    },
    {
        "email": "teacher@school.com",
        "password": "teacher123",
        "full_name": "John Teacher",
        "role": UserRole.TEACHER,
        "teacher_id": None,
    },
    {
        "email": "student@school.com",
        "password": "student123",
        "full_name": "Jane Student",
        "role": UserRole.STUDENT,
        "teacher_id": None,
    },
]


def seed():
    Base.metadata.create_all(bind=engine)
    db = SessionLocal()
    try:
        teacher = None
        for user_data in DEFAULT_USERS:
            existing = db.query(User).filter(User.email == user_data["email"]).first()
            if existing:
                if user_data["role"] == UserRole.TEACHER:
                    teacher = existing
                continue

            user = User(
                email=user_data["email"],
                full_name=user_data["full_name"],
                hashed_password=get_password_hash(user_data["password"]),
                role=user_data["role"],
                teacher_id=user_data["teacher_id"],
            )
            db.add(user)
            db.flush()
            if user_data["role"] == UserRole.TEACHER:
                teacher = user

        if teacher:
            student = db.query(User).filter(User.email == "student@school.com").first()
            if student and not student.teacher_id:
                student.teacher_id = teacher.id

        db.commit()
        print("Database seeded successfully!")
        print("\nDefault login credentials:")
        print("  Super Admin: admin@school.com / admin123")
        print("  Teacher:     teacher@school.com / teacher123")
        print("  Student:     student@school.com / student123")
    finally:
        db.close()


if __name__ == "__main__":
    seed()
