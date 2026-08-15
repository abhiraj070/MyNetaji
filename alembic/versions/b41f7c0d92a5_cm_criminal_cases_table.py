"""cm criminal cases table

Revision ID: b41f7c0d92a5
Revises: c86730c38848
Create Date: 2026-08-09 12:10:44.118207

"""
from typing import Sequence, Union

from alembic import op
import sqlalchemy as sa
from sqlalchemy.dialects import postgresql

# revision identifiers, used by Alembic.
revision: str = 'b41f7c0d92a5'
down_revision: Union[str, Sequence[str], None] = 'c86730c38848'
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


def upgrade() -> None:
    """Upgrade schema."""
    op.create_table('cm_criminal_cases',
    sa.Column('id', sa.Integer(), nullable=False),
    sa.Column('cm_id', sa.Integer(), nullable=False),
    sa.Column('criminal_cases', sa.Integer(), nullable=True),
    sa.Column('charges', postgresql.JSONB(astext_type=sa.Text()), nullable=True),
    sa.Column('election_year', sa.Integer(), nullable=True),
    sa.Column('election_name', sa.Text(), nullable=True),
    sa.Column('source', sa.Text(), nullable=True),
    sa.Column('source_url', sa.Text(), nullable=True),
    sa.Column('myneta_dataset_slug', sa.Text(), nullable=True),
    sa.Column('myneta_candidate_id', sa.Text(), nullable=True),
    sa.Column('fetched_at', sa.DateTime(timezone=True), nullable=True),
    sa.Column('created_at', sa.DateTime(timezone=True), nullable=False),
    sa.Column('updated_at', sa.DateTime(timezone=True), nullable=False),
    sa.PrimaryKeyConstraint('id'),
    sa.UniqueConstraint('cm_id', name='uq_cm_criminal_cases_cm')
    )
    op.create_index(op.f('ix_cm_criminal_cases_cm_id'), 'cm_criminal_cases', ['cm_id'], unique=False)
    # Declared here rather than on the model, for the same reason as
    # `mp_wealth_declaration`: `chief_ministers` is reflected at runtime, so
    # SQLAlchemy has no table object to resolve against at import time.
    op.create_foreign_key(
        'fk_cm_criminal_cases_cm', 'cm_criminal_cases', 'chief_ministers',
        ['cm_id'], ['id'], ondelete='CASCADE'
    )


def downgrade() -> None:
    """Downgrade schema."""
    op.drop_constraint('fk_cm_criminal_cases_cm', 'cm_criminal_cases', type_='foreignkey')
    op.drop_index(op.f('ix_cm_criminal_cases_cm_id'), table_name='cm_criminal_cases')
    op.drop_table('cm_criminal_cases')
