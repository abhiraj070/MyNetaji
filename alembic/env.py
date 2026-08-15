from logging.config import fileConfig

from alembic import context

from app.config.settings import get_settings
from app.db.connect import Base, engine

# Importing the model modules registers their tables on `Base.metadata` so
# autogenerate can see them. Add new model imports here as they're created.
from app.db.model import cm_criminal  # noqa: F401
from app.db.model import daily_counts  # noqa: F401
from app.db.model import feedback  # noqa: F401
from app.db.model import journey  # noqa: F401
from app.db.model import localisation  # noqa: F401
from app.db.model import mp_journey  # noqa: F401
from app.db.model import mp_performance  # noqa: F401
from app.db.model import mp_wealth  # noqa: F401

# Alembic Config object — access to values in alembic.ini.
config = context.config

# Interpret the config file for Python logging.
if config.config_file_name is not None:
    fileConfig(config.config_file_name)

# Autogenerate compares against the tables this repo defines as models.
target_metadata = Base.metadata


def include_name(name, type_, parent_names):
    """Scope Alembic to only the tables this repo owns as models.

    Most tables (chief_ministers, ministers, mps, boundaries, …) are created
    externally and merely *reflected* at runtime — they are NOT in
    `Base.metadata`. Without this filter, `--autogenerate` would see them as
    "in the DB but not in the models" and emit `drop_table` for every one of
    them. Restricting table comparison to `target_metadata` keeps them safe.
    """
    if type_ == "table":
        return name in target_metadata.tables
    return True


def include_object(object_, name, type_, reflected, compare_to):
    """Leave hand-declared foreign keys alone.

    A model here cannot declare an FK onto a *reflected* table (`mps`) — there
    is no table object on this Base to resolve the reference against — so those
    constraints are written directly in their migrations instead. Autogenerate
    then sees an FK in the database with no counterpart in the models and
    proposes dropping it, on every future run.

    Foreign keys are therefore excluded from the comparison altogether: they are
    declared in migrations by hand, which is where they are maintained.
    """
    if type_ == "foreign_key_constraint":
        return False
    return True


def run_migrations_offline() -> None:
    """Run migrations without a DB connection (emits SQL)."""
    context.configure(
        url=get_settings().DB_URL,
        target_metadata=target_metadata,
        literal_binds=True,
        dialect_opts={"paramstyle": "named"},
        include_name=include_name,
        include_object=include_object,
        compare_type=True,
    )

    with context.begin_transaction():
        context.run_migrations()


def run_migrations_online() -> None:
    """Run migrations against the DB, reusing the app's engine.

    Reusing `app.db.connect.engine` means the URL comes straight from settings
    (`DB_URL`) — no credentials duplicated in alembic.ini, and no ConfigParser
    `%`-escaping headaches with the connection string.
    """
    with engine.connect() as connection:
        context.configure(
            connection=connection,
            target_metadata=target_metadata,
            include_name=include_name,
            include_object=include_object,
            compare_type=True,
        )

        with context.begin_transaction():
            context.run_migrations()


if context.is_offline_mode():
    run_migrations_offline()
else:
    run_migrations_online()
