"""user table for google sign-in

Backs `app/db/model/user.py`, which `app/api/auth.py` writes to on every
successful Google callback. The table did not exist, so the callback failed on
its first insert.

`"user"` is a reserved word in Postgres and has to stay quoted in hand-written
SQL; SQLAlchemy quotes it automatically, so the model needs no special care.

Revision ID: 2ff2a6882137
Revises: 4903dd144a43
Create Date: 2026-08-15 17:20:00.000000

"""
from typing import Sequence, Union

from alembic import op
import sqlalchemy as sa

# revision identifiers, used by Alembic.
revision: str = '2ff2a6882137'
down_revision: Union[str, Sequence[str], None] = '4903dd144a43'
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


def upgrade() -> None:
    op.create_table(
        'user',
        sa.Column('id', sa.Integer(), nullable=False),
        sa.Column('google_id', sa.String(), nullable=True),
        sa.Column('email', sa.String(), nullable=True),
        sa.Column('picture', sa.String(), nullable=True),
        sa.Column('name', sa.String(), nullable=True),
        sa.PrimaryKeyConstraint('id'),
    )
    op.create_index(op.f('ix_user_id'), 'user', ['id'], unique=False)
    op.create_index(op.f('ix_user_google_id'), 'user', ['google_id'], unique=False)
    # Unique: one account per Google email. The callback looks a returning user
    # up by this before inserting, so a second sign-in updates rather than
    # collides.
    op.create_index(op.f('ix_user_email'), 'user', ['email'], unique=True)


def downgrade() -> None:
    op.drop_index(op.f('ix_user_email'), table_name='user')
    op.drop_index(op.f('ix_user_google_id'), table_name='user')
    op.drop_index(op.f('ix_user_id'), table_name='user')
    op.drop_table('user')
