from typing import List, Dict, Any, Set
from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.orm import Session

from app.db.session import get_db
from app.models.entities import Case, Evidence, Entity, Relationship, Finding, FindingEvidence
from app.schemas.domain import GraphResponse, GraphNode, GraphEdge

router = APIRouter(tags=["graph"])

@router.get("/cases/{case_id}/graph", response_model=GraphResponse)
def get_case_graph(case_id: str, db: Session = Depends(get_db)):
    case = db.query(Case).filter(Case.id == case_id).first()
    if not case:
        raise HTTPException(status_code=404, detail="Case not found")

    evidence_items = db.query(Evidence).filter(Evidence.case_id == case_id).all()
    entities = db.query(Entity).filter(Entity.case_id == case_id).all()
    relationships = db.query(Relationship).filter(Relationship.case_id == case_id).all()
    findings = db.query(Finding).filter(Finding.case_id == case_id).all()

    nodes: List[GraphNode] = []
    edges: List[GraphEdge] = []
    node_id_map: Dict[str, str] = {} # raw UUID -> graph node ID

    # 1. Evidence Nodes
    for ev in evidence_items:
        g_id = f"ev_{ev.id}"
        node_id_map[ev.id] = g_id
        nodes.append(GraphNode(
            id=g_id,
            label=ev.original_filename,
            type="EVIDENCE",
            data={
                "db_id": ev.id,
                "filename": ev.original_filename,
                "media_type": ev.media_type,
                "sha256": ev.sha256,
                "status": ev.processing_status,
                "size_bytes": ev.size_bytes,
                "verification_status": ev.verification_status
            }
        ))

    # 2. Entity Nodes
    for ent in entities:
        g_id = f"ent_{ent.id}"
        node_id_map[ent.id] = g_id
        nodes.append(GraphNode(
            id=g_id,
            label=ent.display_value,
            type=ent.entity_type,
            data={
                "db_id": ent.id,
                "normalized_value": ent.normalized_value,
                "entity_type": ent.entity_type,
                "metadata": ent.metadata_ or {}
            }
        ))

    # 3. Finding Nodes
    for f in findings:
        g_id = f"find_{f.id}"
        node_id_map[f.id] = g_id
        nodes.append(GraphNode(
            id=g_id,
            label=f"{f.finding_number}: {f.title[:25]}...",
            type="FINDING",
            data={
                "db_id": f.id,
                "finding_number": f.finding_number,
                "title": f.title,
                "finding_type": f.finding_type,
                "confidence": f.confidence,
                "review_status": f.review_status
            }
        ))

    # 4. Edges from Relationships table
    seen_edges: Set[str] = set()
    for rel in relationships:
        src = node_id_map.get(rel.source_entity_id)
        tgt = node_id_map.get(rel.target_entity_id)
        if src and tgt and src != tgt:
            edge_key = f"{src}->{tgt}:{rel.relationship_type}"
            if edge_key not in seen_edges:
                seen_edges.add(edge_key)
                edges.append(GraphEdge(
                    id=f"rel_{rel.id}",
                    source=src,
                    target=tgt,
                    label=rel.relationship_type.replace("_", " "),
                    relationship_type=rel.relationship_type,
                    derivation_method=rel.derivation_method,
                    confidence=rel.confidence,
                    explanation=rel.explanation,
                    supporting_evidence=rel.supporting_evidence
                ))

    # 5. Connect Findings to their Supporting Evidence
    finding_evidence_links = db.query(FindingEvidence).join(
        Finding, FindingEvidence.finding_id == Finding.id
    ).filter(Finding.case_id == case_id).all()

    for fe in finding_evidence_links:
        src = node_id_map.get(fe.finding_id)
        tgt = node_id_map.get(fe.evidence_id)
        if src and tgt:
            edge_key = f"{src}->{tgt}:SUPPORTS_FINDING"
            if edge_key not in seen_edges:
                seen_edges.add(edge_key)
                edges.append(GraphEdge(
                    id=f"fe_{fe.id}",
                    source=src,
                    target=tgt,
                    label=fe.support_type.replace("_", " "),
                    relationship_type="SUPPORTS_FINDING",
                    derivation_method="ANALYST_CONFIRMED" if fe.support_type == "PRIMARY_ARTIFACT" else "RULE_DERIVED",
                    confidence=0.95,
                    explanation=fe.explanation,
                    supporting_evidence=[fe.evidence_id]
                ))

    return GraphResponse(nodes=nodes, edges=edges)
