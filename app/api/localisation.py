
import json

from sqlalchemy import func

from app.api.tables import cm, manifesto, milestones, minister, mp, mp_hindi

HINDI = "hi"


def _localised(table, column_name, lang):
    column = table.c[column_name]
    if lang != HINDI:
        return column
    hindi = table.c.get(f"{column_name}_hindi")
    if hindi is None:
        return column
    return func.coalesce(hindi, column).label(column_name)


def cm_columns(lang, *names):
    return tuple(_localised(cm, n, lang) for n in names)


def minister_columns(lang, *names):
    return tuple(_localised(minister, n, lang) for n in names)


def milestone_columns(lang, *names):
    return tuple(_localised(milestones, n, lang) for n in names)


def mp_localised(lang):
    if lang != HINDI:
        return mp.c.name, mp.c.state, mp.c.constituency
    return (
        func.coalesce(mp_hindi.c.name_hindi, mp.c.name).label("name"),
        func.coalesce(mp_hindi.c.state_hindi, mp.c.state).label("state"),
        func.coalesce(mp_hindi.c.constituency_hindi, mp.c.constituency).label("constituency"),
    )


def with_mp_hindi(stmt, lang):
    if lang != HINDI:
        return stmt
    return stmt.select_from(mp).join(
        mp_hindi, mp.c.id==mp_hindi.c.mp_id, isouter=True
    )


def manifesto_columns(lang):
    if lang != HINDI:
        return (manifesto.c.points,)
    return (manifesto.c.points, manifesto.c.points_hindi)


def localise_points(row, lang):
    if row is None or lang != HINDI:
        return row
    data= dict(row)
    raw= data.pop("points_hindi", None)
    if raw:
        try:
            parsed= json.loads(raw)
            if isinstance(parsed, list):
                data["points"]= parsed
        except (TypeError, ValueError):
            pass
    return data

MP_NAME_EN = mp.c.name.label("name_en")
CM_NAME_EN = cm.c.name.label("name_en")
MINISTER_NAME_EN = minister.c.minister_name.label("minister_name_en")
