"""Fictional demo data for development and demonstrations only.

Every record is fictional and tagged/labelled "DEMO" so it can never be confused with real
office data. Loading is refused in production (see ava.cli seed-demo).
"""

from __future__ import annotations

from datetime import timedelta
from decimal import Decimal

from sqlalchemy import select
from sqlalchemy.orm import Session

from ava.models import (
    Client,
    ClientContact,
    Consultant,
    ConsultantContact,
    Project,
    ProjectConsultant,
)
from ava.services.clock import office_today


def seed(db: Session) -> int:
    if db.scalar(select(Project.id).where(Project.tags.contains(["demo"]))):
        return 0
    today = office_today()
    client = Client(
        name="DEMO Municipality of Example",
        billing_name="DEMO Municipality",
        notes="Fictional demo client.",
        contacts=[
            ClientContact(
                full_name="Demo Contact",
                title="Director",
                email="contact@example.com",
                is_primary=True,
            )
        ],
    )
    structural = Consultant(
        company_name="DEMO Structural Engineers",
        discipline="structural",
        email="structural@example.com",
        contacts=[
            ConsultantContact(full_name="Demo Structural Engineer", email="engineer@example.com")
        ],
    )
    electrical = Consultant(
        company_name="DEMO Electrical Consultants",
        discipline="electrical",
        contacts=[
            ConsultantContact(full_name="Demo Electrical Engineer", email="electrical@example.com")
        ],
    )
    db.add_all([client, structural, electrical])
    db.flush()
    projects = [
        Project(
            project_number="D-0001",
            name="DEMO School Renovation",
            short_name="Demo School",
            client=client,
            location="Example City",
            status="active",
            phase="construction_documents",
            deadline=today + timedelta(days=2),
            contract_value=Decimal("250000.00"),
            tags=["demo"],
        ),
        Project(
            project_number="D-0002",
            name="DEMO Community Center",
            client=client,
            location="Example Town",
            status="active",
            phase="construction_administration",
            deadline=today + timedelta(days=9),
            tags=["demo"],
        ),
    ]
    db.add_all(projects)
    db.flush()
    db.add_all(
        [
            ProjectConsultant(
                project_id=projects[0].id,
                consultant_id=structural.id,
                contact_id=structural.contacts[0].id,
                discipline="structural",
            ),
            ProjectConsultant(
                project_id=projects[0].id,
                consultant_id=electrical.id,
                contact_id=electrical.contacts[0].id,
                discipline="electrical",
            ),
        ]
    )
    return len(projects)
