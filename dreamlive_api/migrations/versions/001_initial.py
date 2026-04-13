"""Initial migration – creates all tables

Revision ID: 001_initial
Revises:
Create Date: 2025-01-01 00:00:00
"""
from typing import Sequence, Union
from alembic import op
import sqlalchemy as sa
from sqlalchemy.dialects import postgresql

revision: str = "001_initial"
down_revision: Union[str, None] = None
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


def upgrade() -> None:
    # ── agencies ─────────────────────────────────────────────────────────────
    op.create_table(
        "agencies",
        sa.Column("id", sa.Integer(), primary_key=True),
        sa.Column("name", sa.String(200), nullable=False),
        sa.Column("code", sa.String(20), unique=True, nullable=False, index=True),
        sa.Column("owner_id", sa.Integer(), sa.ForeignKey("users.id"), nullable=True),
        sa.Column("is_active", sa.Boolean(), server_default="true", nullable=False),
        sa.Column("created_at", sa.DateTime(timezone=True), server_default=sa.text("now()")),
    )

    # ── users ─────────────────────────────────────────────────────────────────
    op.create_table(
        "users",
        sa.Column("id", sa.Integer(), primary_key=True),
        sa.Column("email", sa.String(255), unique=True, nullable=False, index=True),
        sa.Column("username", sa.String(100), unique=True, nullable=False, index=True),
        sa.Column("full_name", sa.String(200), server_default=""),
        sa.Column("hashed_password", sa.String(255), nullable=False),
        sa.Column("role", sa.Enum("admin", "programmer", "owner", "agent", name="userrole"), nullable=False),
        sa.Column("status", sa.Enum("active", "inactive", "pending", name="userstatus"),
                  server_default="pending", nullable=False),
        sa.Column("agency_id", sa.Integer(), sa.ForeignKey("agencies.id"), nullable=True),
        sa.Column("is_2fa_enabled", sa.Boolean(), server_default="false"),
        sa.Column("totp_secret", sa.String(64), nullable=True),
        sa.Column("reset_token", sa.String(255), nullable=True),
        sa.Column("reset_token_expires", sa.DateTime(timezone=True), nullable=True),
        sa.Column("created_at", sa.DateTime(timezone=True), server_default=sa.text("now()")),
        sa.Column("updated_at", sa.DateTime(timezone=True), server_default=sa.text("now()")),
    )

    # ── licenses ──────────────────────────────────────────────────────────────
    op.create_table(
        "licenses",
        sa.Column("id", sa.Integer(), primary_key=True),
        sa.Column("key", sa.String(100), unique=True, nullable=False, index=True),
        sa.Column("agency_id", sa.Integer(), sa.ForeignKey("agencies.id"), nullable=False),
        sa.Column("recruiter_name", sa.String(200), nullable=False),
        sa.Column("status", sa.Enum("active", "inactive", "expired", name="licensestatus"),
                  server_default="active", nullable=False),
        sa.Column("request_limit", sa.Integer(), server_default="60", nullable=False),
        sa.Column("refresh_minutes", sa.Integer(), server_default="1", nullable=False),
        sa.Column("expires_at", sa.DateTime(timezone=True), nullable=True),
        sa.Column("last_seen_at", sa.DateTime(timezone=True), nullable=True),
        sa.Column("created_at", sa.DateTime(timezone=True), server_default=sa.text("now()")),
    )

    # ── leads ─────────────────────────────────────────────────────────────────
    op.create_table(
        "leads",
        sa.Column("id", sa.Integer(), primary_key=True),
        sa.Column("username", sa.String(200), nullable=False, index=True),
        sa.Column("license_id", sa.Integer(), sa.ForeignKey("licenses.id"), nullable=False),
        sa.Column("agency_id", sa.Integer(), sa.ForeignKey("agencies.id"), nullable=False),
        sa.Column("status", sa.Enum("disponible", "contactado", "recopilado", name="leadstatus"),
                  server_default="disponible", nullable=False, index=True),
        sa.Column("followers", sa.BigInteger(), server_default="0"),
        sa.Column("following", sa.BigInteger(), server_default="0"),
        sa.Column("keywords", postgresql.ARRAY(sa.String()), server_default="{}"),
        sa.Column("profile_url", sa.String(500), nullable=True),
        sa.Column("contacted_at", sa.DateTime(timezone=True), nullable=True),
        sa.Column("collected_at", sa.DateTime(timezone=True), nullable=True),
        sa.Column("created_at", sa.DateTime(timezone=True), server_default=sa.text("now()"), index=True),
    )

    # ── app_versions ──────────────────────────────────────────────────────────
    op.create_table(
        "app_versions",
        sa.Column("id", sa.Integer(), primary_key=True),
        sa.Column("version_number", sa.String(30), nullable=False),
        sa.Column("platform", sa.Enum("windows", "macos", name="platform"), nullable=False),
        sa.Column("file_url", sa.Text(), nullable=False),
        sa.Column("file_size_kb", sa.Integer(), server_default="0"),
        sa.Column("changelog", sa.Text(), server_default=""),
        sa.Column("tags", postgresql.ARRAY(sa.String()), server_default="{}"),
        sa.Column("is_active", sa.Boolean(), server_default="true", nullable=False),
        sa.Column("release_date", sa.DateTime(timezone=True), server_default=sa.text("now()")),
    )

    # ── Índices adicionales ───────────────────────────────────────────────────
    op.create_index("ix_leads_agency_status", "leads", ["agency_id", "status"])
    op.create_index("ix_leads_agency_contacted", "leads", ["agency_id", "contacted_at"])
    op.create_index("ix_licenses_agency_status", "licenses", ["agency_id", "status"])


def downgrade() -> None:
    op.drop_table("app_versions")
    op.drop_table("leads")
    op.drop_table("licenses")
    op.drop_table("users")
    op.drop_table("agencies")
    op.execute("DROP TYPE IF EXISTS userrole")
    op.execute("DROP TYPE IF EXISTS userstatus")
    op.execute("DROP TYPE IF EXISTS licensestatus")
    op.execute("DROP TYPE IF EXISTS leadstatus")
    op.execute("DROP TYPE IF EXISTS platform")
