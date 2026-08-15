from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.orm import Session

from app.db.connect import get_db
from app.db.model.feedback import Feedback
from app.schema import FeedbackRequest

router = APIRouter(tags=["Feedback"])


@router.post("/feedback")
def submit_feedback(request: FeedbackRequest, db: Session= Depends(get_db)):
    reaction= request.reaction
    if reaction not in ("SLAP", "ROSE"):
        raise HTTPException(status_code=400, detail="reaction must be 'SLAP' or 'ROSE'")
    entry= Feedback(message=request.message, reaction=reaction)
    db.add(entry)
    db.commit()
    db.refresh(entry)
    return {"ok": True, "id": entry.id}
